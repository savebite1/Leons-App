import Foundation

struct LocalScheduleInterpreter {
    private let timePattern = #"\b([01]?\d|2[0-3])(?:(?::|\.)([0-5]\d))?\s*(Uhr)?\b"#

    func parse(_ text: String, now: Date = Date(), calendar: Calendar = .current) -> ParsedDayIntent {
        var intent = ParsedDayIntent()
        let clauses = text
            .replacingOccurrences(of: ";", with: ",")
            .components(separatedBy: CharacterSet(charactersIn: ",."))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        for clause in clauses {
            let lower = clause.lowercased()
            let times = times(in: clause, now: now, calendar: calendar)

            if (lower.contains("komme") && lower.contains("schule")) || lower.contains("zuhause") || lower.contains("zurück") {
                intent.availableFrom = times.first ?? intent.availableFrom
            }

            if lower.contains("los") {
                intent.departureAt = times.first ?? intent.departureAt
            }

            if lower.contains("treff") || lower.contains("freunde") {
                intent.socialAt = times.first ?? intent.socialAt
            }

            if let interval = interval(in: clause, now: now, calendar: calendar) {
                let kind: DayBlockKind
                let title: String
                if lower.contains("ess") || lower.contains("mittag") {
                    kind = .meal; title = "Essen"
                } else if lower.contains("lern") {
                    kind = .study; title = "Lernen"
                } else if lower.contains("train") || lower.contains("sport") {
                    kind = .workout; title = "Training"
                } else {
                    kind = .other; title = "Fixer Block"
                }
                intent.hardBlocks.append(DayBlock(title: title, start: interval.0, end: interval.1, kind: kind, isHardConstraint: true, source: "user"))
            }
        }

        if let minutes = studyMinutes(in: text) {
            intent.requestedStudyMinutes = minutes
        }

        return intent
    }

    private func studyMinutes(in text: String) -> Int? {
        let pattern = #"(\d{1,3})\s*(?:min|minuten)\b[^.!?]{0,40}\blern"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        guard let match = regex.firstMatch(in: text, range: range), let valueRange = Range(match.range(at: 1), in: text) else { return nil }
        return Int(text[valueRange])
    }

    private func interval(in text: String, now: Date, calendar: Calendar) -> (Date, Date)? {
        let token = #"(?:[01]?\d|2[0-3])(?:(?::|\.)[0-5]\d)?(?:\s*Uhr)?"#
        let pattern = #"(?:von\s+)?("# + token + #")\s*(?:bis|-)\s*("# + token + #")"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              let aRange = Range(match.range(at: 1), in: text),
              let bRange = Range(match.range(at: 2), in: text),
              let start = date(from: String(text[aRange]), now: now, calendar: calendar),
              let end = date(from: String(text[bRange]), now: now, calendar: calendar),
              end > start else { return nil }
        return (start, end)
    }

    private func times(in text: String, now: Date, calendar: Calendar) -> [Date] {
        guard let regex = try? NSRegularExpression(pattern: timePattern, options: [.caseInsensitive]) else { return [] }
        let fullRange = NSRange(text.startIndex..<text.endIndex, in: text)
        return regex.matches(in: text, range: fullRange).compactMap { match in
            let hasMinutes = match.range(at: 2).location != NSNotFound
            let hasUhr = match.range(at: 3).location != NSNotFound
            guard hasMinutes || hasUhr, let range = Range(match.range(at: 0), in: text) else { return nil }
            return date(from: String(text[range]), now: now, calendar: calendar)
        }
    }

    private func date(from token: String, now: Date, calendar: Calendar) -> Date? {
        var cleaned = token.lowercased().replacingOccurrences(of: "uhr", with: "").trimmingCharacters(in: .whitespaces)
        cleaned = cleaned.replacingOccurrences(of: ".", with: ":")
        let parts = cleaned.split(separator: ":")
        guard let hour = Int(parts[0]), (0...23).contains(hour) else { return nil }
        let minute = parts.count > 1 ? (Int(parts[1]) ?? 0) : 0
        return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: now)
    }
}

struct PlanningEngine {
    func makeTimeline(from intent: ParsedDayIntent) -> [DayBlock] {
        var blocks = intent.hardBlocks
        let calendar = Calendar.current

        if let departure = intent.departureAt, let social = intent.socialAt, social > departure {
            blocks.append(DayBlock(title: "Los zu Freunden", start: departure, end: social, kind: .travel, isHardConstraint: true, source: "user"))
        }

        if let social = intent.socialAt {
            blocks.append(DayBlock(title: "Freunde", start: social, end: nil, kind: .social, isHardConstraint: true, source: "user"))
        }

        if let availableFrom = intent.availableFrom,
           let limit = intent.departureAt ?? intent.socialAt,
           limit > availableFrom,
           let requested = intent.requestedStudyMinutes,
           requested >= 5 {
            let hardWithEnds = blocks
                .filter { $0.end != nil && $0.start < limit && ($0.end ?? $0.start) > availableFrom }
                .sorted { $0.start < $1.start }

            var cursor = availableFrom
            var chosen: (Date, Date)?

            for block in hardWithEnds {
                if block.start > cursor {
                    let gapMinutes = calendar.dateComponents([.minute], from: cursor, to: block.start).minute ?? 0
                    if gapMinutes >= requested {
                        chosen = (cursor, calendar.date(byAdding: .minute, value: requested, to: cursor)!)
                        break
                    }
                }
                if let end = block.end, end > cursor { cursor = end }
            }

            if chosen == nil && limit > cursor {
                let gapMinutes = calendar.dateComponents([.minute], from: cursor, to: limit).minute ?? 0
                if gapMinutes >= requested {
                    chosen = (cursor, calendar.date(byAdding: .minute, value: requested, to: cursor)!)
                }
            }

            if let chosen {
                blocks.append(DayBlock(title: "\(requested) Min Lern-Sprint", start: chosen.0, end: chosen.1, kind: .study, isHardConstraint: false, source: "planner"))
            }
        }

        return blocks.sorted { lhs, rhs in
            if lhs.start == rhs.start { return lhs.isHardConstraint && !rhs.isHardConstraint }
            return lhs.start < rhs.start
        }
    }
}
