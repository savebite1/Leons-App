import Foundation

enum DayBlockKind: String, Codable, CaseIterable {
    case school, meal, study, travel, social, workout, project, free, other

    var title: String {
        switch self {
        case .school: return "Schule"
        case .meal: return "Essen"
        case .study: return "Lernen"
        case .travel: return "Weg"
        case .social: return "Freunde"
        case .workout: return "Training"
        case .project: return "Projekt"
        case .free: return "Freie Zeit"
        case .other: return "Termin"
        }
    }
}

struct DayBlock: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var start: Date
    var end: Date?
    var kind: DayBlockKind
    var isHardConstraint: Bool
    var source: String

    init(id: UUID = UUID(), title: String, start: Date, end: Date? = nil, kind: DayBlockKind, isHardConstraint: Bool, source: String) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.kind = kind
        self.isHardConstraint = isHardConstraint
        self.source = source
    }

    var durationMinutes: Int? {
        guard let end else { return nil }
        return max(0, Int(end.timeIntervalSince(start) / 60))
    }
}

struct LearningTopic: Identifiable, Codable, Equatable {
    let id: UUID
    var subject: String
    var name: String
    var understanding: Double
    var independentAccuracy: Double
    var difficulty: Double
    var estimatedMinutesRemaining: Int?
    var lastIndependentCheck: Date?

    init(id: UUID = UUID(), subject: String, name: String, understanding: Double = 0, independentAccuracy: Double = 0, difficulty: Double = 0.5, estimatedMinutesRemaining: Int? = nil, lastIndependentCheck: Date? = nil) {
        self.id = id
        self.subject = subject
        self.name = name
        self.understanding = understanding
        self.independentAccuracy = independentAccuracy
        self.difficulty = difficulty
        self.estimatedMinutesRemaining = estimatedMinutesRemaining
        self.lastIndependentCheck = lastIndependentCheck
    }
}

struct Exam: Identifiable, Codable, Equatable {
    let id: UUID
    var subject: String
    var title: String
    var date: Date
    var topicIDs: [UUID]
    var lastGrade: Double?
    var realisticTargetLower: Double?
    var realisticTargetUpper: Double?

    init(id: UUID = UUID(), subject: String, title: String, date: Date, topicIDs: [UUID] = [], lastGrade: Double? = nil, realisticTargetLower: Double? = nil, realisticTargetUpper: Double? = nil) {
        self.id = id
        self.subject = subject
        self.title = title
        self.date = date
        self.topicIDs = topicIDs
        self.lastGrade = lastGrade
        self.realisticTargetLower = realisticTargetLower
        self.realisticTargetUpper = realisticTargetUpper
    }
}

struct LearningProfile: Codable, Equatable {
    var preferredStudyTimes: [String] = []
    var preferredSessionMinutes: Int?
    var afterSchoolRecoveryMinutes: Int?
    var selfReportedPreferences: [String] = []
    var learnedPatterns: [String] = []
}

struct UserProfile: Codable, Equatable {
    var name: String = ""
    var schoolType: String = ""
    var classLevel: String = ""
    var longTermGradeGoal: Double?
    var learningProfile = LearningProfile()
}

struct ParsedDayIntent: Equatable {
    var availableFrom: Date?
    var departureAt: Date?
    var socialAt: Date?
    var requestedStudyMinutes: Int?
    var hardBlocks: [DayBlock] = []
}

struct OSCommandResult {
    var message: String
    var replacementTimeline: [DayBlock]?
}
