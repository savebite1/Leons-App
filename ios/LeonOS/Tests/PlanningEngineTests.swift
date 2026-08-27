import XCTest
@testable import LeonOS

final class PlanningEngineTests: XCTestCase {
    func testParsesRealisticGermanAfternoonAndFindsStudyGap() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Berlin")!
        let now = calendar.date(from: DateComponents(year: 2026, month: 8, day: 27, hour: 14, minute: 0))!

        let text = "Um 15 Uhr komme ich von der Schule zurück und um 16 Uhr treffe ich mich mit Freunden und von 15 Uhr bis 15:30 esse ich was. Ich kann noch 15 Minuten lernen, weil ich vor 15:45 Uhr schon los muss."

        let intent = LocalScheduleInterpreter().parse(text, now: now, calendar: calendar)
        let timeline = PlanningEngine().makeTimeline(from: intent)

        XCTAssertEqual(time(intent.availableFrom, calendar: calendar), "15:00")
        XCTAssertEqual(time(intent.departureAt, calendar: calendar), "15:45")
        XCTAssertEqual(time(intent.socialAt, calendar: calendar), "16:00")
        XCTAssertEqual(intent.requestedStudyMinutes, 15)

        let meal = try XCTUnwrap(timeline.first(where: { $0.kind == .meal }))
        XCTAssertEqual(time(meal.start, calendar: calendar), "15:00")
        XCTAssertEqual(time(meal.end, calendar: calendar), "15:30")

        let study = try XCTUnwrap(timeline.first(where: { $0.kind == .study && !$0.isHardConstraint }))
        XCTAssertEqual(time(study.start, calendar: calendar), "15:30")
        XCTAssertEqual(time(study.end, calendar: calendar), "15:45")

        let travel = try XCTUnwrap(timeline.first(where: { $0.kind == .travel }))
        XCTAssertEqual(time(travel.start, calendar: calendar), "15:45")
        XCTAssertEqual(time(travel.end, calendar: calendar), "16:00")
    }

    private func time(_ date: Date?, calendar: Calendar) -> String? {
        guard let date else { return nil }
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? -1, parts.minute ?? -1)
    }
}
