import Foundation

struct ContextSnapshot {
    let now: Date
    let calendar: Calendar
    let timeline: [DayBlock]
    let topics: [LearningTopic]
    let exams: [Exam]

    var nextBlock: DayBlock? {
        timeline
            .filter { ($0.end ?? $0.start) >= now }
            .sorted { $0.start < $1.start }
            .first
    }
}

struct ContextEngine {
    func snapshot(now: Date = Date(), timeline: [DayBlock], topics: [LearningTopic], exams: [Exam]) -> ContextSnapshot {
        ContextSnapshot(now: now, calendar: .current, timeline: timeline, topics: topics, exams: exams)
    }
}
