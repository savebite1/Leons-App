import Foundation

struct LocalScheduleInterpreter {
    private let timeToken = #"(?:[01]?\d|2[0-3])(?:(?::|\.)[0-5]\d)?(?:\s*Uhr)?"#

    func parse(_ text: String, now: Date = Date(), calendar: Calendar = .current) -> ParsedDayIntent {
        var intent = ParsedDayIntent()

        intent.availableFrom = firstTime(
            in: text,
            patterns: [
                #"(?:um\s+)?("# + timeToken + #")\s+[^.!?]{0,45}(?:komme|bin)[^.!?]{0,45}(?:schule|zuhause|zurück|nach hause)"#,
                #"(?:komme|bin)[^.!?]{0,35}(?:um\s+)?("# + timeToken + #")[^.!?]{0,35}(?:zuhause|zurück|nach hause)"#
            ],
            now: now,
            calendar: calendar
        )

        intent.departureAt = firstTime(
            in: text,
            patterns: [
                #"(?:spätestens\s+)?(?:vor|um)\s+("# + timeToken + #")[^.!?]{0,55}\blos\b"#,
                #"\blos\b[^.!?]{0,30}(?:vor|um)\s+("# + timeToken + #")"#
            ],
            now: now,
            calendar: calendar
        )

        intent.socialAt = firstTime(
            in: text,
            patterns: [
                #"(?:um\s+)?("# + timeToken + #")[^.!?]{0,45}(?:treff|freunde)"#,
                #"(?:treff|freunde)[^.!?]{0,30}(?:um\s+)?("# + timeToken + #")"#
            ],
            now: now,
            calendar: calendar
        )

        intent.hardBlocks = intervals(in: text, now: now, calendar: calendar)

        if let minutes = studyMinutes(in: text) {
            intent.requestedStudyMinutes = minutes
        }

        return intent
    }

    private func studyMinutes(in text: String) -> Int? {
        let patterns = [
            #"(\d{1,3})\s*(?:min|minuten)\b[^.!?]{0,45}\blern"#,
            #"\blern[^.!?]{0,30}(\d{1,3})\s*(?:min|minuten)\b"#
        ]
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { continue }
            let range = NSRange(text.startIndex..<text.endIndex, in: text)
            guard let match = regex.firstMatch(in: text, range: range),
                  let valueRange = Range(match.range(at: 1), in: text),
                  let value = Int(text[valueRange]) else { continue }
            return value
        }
        return nil
    }

    private func intervals(in text: String, now: Date, calendar: Calendar) -> [DayBlock] {
        let pattern = #"(?:(?:von|um)\s+)?("# + timeToken + #")\s*(?:bis|-)\s*("# + timeToken + #")"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return [] }
        let nsText = text as NSString
        let fullRange = NSRange(location: 0, length: nsText.length)

        return regex.matches(in: text, range: fullRange).compactMap { match in
            guard let startRange = Range(match.range(at: 1), in: text),
                  let endRange = Range(match.range(at: 2), in: text),
                  let start = date(from: String(text[startRange]), now: now, calendar: calendar),
                  let end = date(from: String(text[endRange]), now: now, calendar: calendar),
                  end > start else { return nil }

            let contextStart = max(0, match.range.location - 55)
            let contextEnd = min(nsText.length, NSMaxRange(match.range) + 70)
            let context = nsText.substring(with: NSRange(location: contextStart, length: contextEnd - contextStart)).lowercased()

            let kind: DayBlockKind
            let title: String
            if context.contains("ess") || context.contains("mittag") || context.contains("frühstück") {
                kind = .meal; title = "Essen"
            } else if context.contains("train") || context.contains("sport") || context.contains("gym") {
                kind = .workout; title = "Training"
            } else if context.contains("lern") {
                kind = .study; title = "Lernen"
            } else {
                kind = .other; title = "Fixer Block"
            }

            return DayBlock(title: title, start: start, end: end, kind: kind, isHardConstraint: true, source: "user")
        }
    }

    private func firstTime(in text: String, patterns: [String], now: Date, calendar: Calendar) -> Date? {
        let fullRange = NSRange(text.startIndex..<text.endIndex, in: text)
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
                  let match = regex.firstMatch(in: text, range: fullRange),
                  let tokenRange = Range(match.range(at: 1), in: text),
                  let result = date(from: String(text[tokenRange]), now: now, calendar: calendar) else { continue }
            return result
        }
        return nil
    }

    private func date(from token: String, now: Date, calendar: Calendar) -> Date? {
        var cleaned = token.lowercased()
            .replacingOccurrences(of: "uhr", with: "")
            .trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: ".", with: ":")
        while cleaned.contains("  ") { cleaned = cleaned.replacingOccurrences(of: "  ", with: " ") }
        let parts = cleaned.split(separator: ":")
        guard let hour = Int(parts[0]), (0...23).contains(hour) else { return nil }
        let minute = parts.count > 1 ? (Int(parts[1]) ?? 0) : 0
        guard (0...59).contains(minute) else { return nil }
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
