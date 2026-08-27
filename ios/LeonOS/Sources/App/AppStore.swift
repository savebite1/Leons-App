import Combine
import Foundation

private struct PersistedV6State: Codable {
    var profile: UserProfile
    var timeline: [DayBlock]
    var topics: [LearningTopic]
    var exams: [Exam]
}

@MainActor
final class AppStore: ObservableObject {
    private static let storageKey = "leon-os-v6-native-state"

    @Published var profile = UserProfile() { didSet { persistIfReady() } }
    @Published var timeline: [DayBlock] = [] { didSet { persistIfReady() } }
    @Published var topics: [LearningTopic] = [] { didSet { persistIfReady() } }
    @Published var exams: [Exam] = [] { didSet { persistIfReady() } }
    @Published var osMessage: String = "Sag mir einfach, wie dein Tag aussieht."
    @Published var isProcessing = false

    private let interpreter = LocalScheduleInterpreter()
    private let planner = PlanningEngine()
    private let contextEngine = ContextEngine()
    private var readyToPersist = false

    init() {
        restore()
        readyToPersist = true
    }

    var context: ContextSnapshot {
        contextEngine.snapshot(timeline: timeline, topics: topics, exams: exams)
    }

    var nextMove: DayBlock? { context.nextBlock }

    func submit(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isProcessing = true
        defer { isProcessing = false }

        let intent = interpreter.parse(trimmed)
        let planned = planner.makeTimeline(from: intent)

        guard !planned.isEmpty else {
            osMessage = "Ich habe daraus noch keinen sicheren Zeitplan erkannt. Nenne mir am besten Ankunft, feste Termine und wann du losmusst."
            return
        }

        timeline = planned

        if let study = planned.first(where: { $0.kind == .study }), let end = study.end {
            osMessage = "Passt. Ich habe ein echtes Lernfenster von \(Self.time(study.start)) bis \(Self.time(end)) gefunden. Ich plane nur das ein, was vor deinen festen Terminen wirklich reinpasst."
        } else {
            osMessage = "Ich habe deine festen Zeiten übernommen. Aktuell sehe ich kein sicheres Lernfenster, das ich ohne Annahmen einplanen sollte."
        }
    }

    private func restore() {
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let restored = try? JSONDecoder().decode(PersistedV6State.self, from: data) else { return }
        profile = restored.profile
        timeline = restored.timeline
        topics = restored.topics
        exams = restored.exams
    }

    private func persistIfReady() {
        guard readyToPersist else { return }
        let state = PersistedV6State(profile: profile, timeline: timeline, topics: topics, exams: exams)
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }

    private static func time(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }
}
