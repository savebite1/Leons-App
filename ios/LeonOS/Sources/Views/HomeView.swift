import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: AppStore
    @State private var command = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    nextMove
                    timeline
                    commandBox
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
            .background(LeonTheme.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)))
                .font(.caption.weight(.semibold))
                .foregroundStyle(LeonTheme.secondary)
                .textCase(.uppercase)

            Text(store.profile.name.isEmpty ? "Was zählt heute?" : "Was zählt heute, \(store.profile.name)?")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(LeonTheme.text)
                .tracking(-1.1)
        }
    }

    @ViewBuilder
    private var nextMove: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("NEXT MOVE")
                    .font(.caption2.weight(.bold))
                    .tracking(1.4)
                    .foregroundStyle(LeonTheme.blue)
                Spacer()
                OSOrb(size: 30)
            }

            if let block = store.nextMove {
                VStack(alignment: .leading, spacing: 8) {
                    Text(block.title)
                        .font(.system(size: 27, weight: .bold, design: .rounded))
                        .foregroundStyle(LeonTheme.text)
                    Text(timeRange(block))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(LeonTheme.secondary)

                    if block.kind == .study {
                        Text("Der Block passt in dein echtes freies Fenster. Keine künstlich vollgestopfte Planung.")
                            .font(.subheadline)
                            .foregroundStyle(LeonTheme.secondary)
                            .padding(.top, 2)
                    }
                }
            } else {
                Text("Erzähl OS kurz, wie dein Nachmittag aussieht. Ich plane erst, wenn ich deine echten Grenzen kenne.")
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(LeonTheme.text)
            }
        }
        .leonCard()
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Dein Tag")
                    .font(.headline)
                Spacer()
                if !store.timeline.isEmpty {
                    Text("\(store.timeline.count) Blöcke")
                        .font(.caption)
                        .foregroundStyle(LeonTheme.secondary)
                }
            }

            if store.timeline.isEmpty {
                Text("Noch nichts geplant.")
                    .font(.subheadline)
                    .foregroundStyle(LeonTheme.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 10)
            } else {
                VStack(spacing: 0) {
                    ForEach(store.timeline) { block in
                        HStack(alignment: .top, spacing: 14) {
                            Text(block.start.formatted(date: .omitted, time: .shortened))
                                .font(.caption.monospacedDigit().weight(.semibold))
                                .foregroundStyle(LeonTheme.secondary)
                                .frame(width: 46, alignment: .leading)

                            Circle()
                                .fill(color(for: block.kind))
                                .frame(width: 9, height: 9)
                                .padding(.top, 4)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(block.title)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(LeonTheme.text)
                                Text(block.isHardConstraint ? "Fix" : "Von OS geplant")
                                    .font(.caption)
                                    .foregroundStyle(LeonTheme.secondary)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 11)

                        if block.id != store.timeline.last?.id {
                            Divider().opacity(0.45)
                        }
                    }
                }
            }
        }
        .leonCard()
    }

    private var commandBox: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                OSOrb(size: 28)
                Text(store.osMessage)
                    .font(.subheadline)
                    .foregroundStyle(LeonTheme.secondary)
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField("z. B. 15 Uhr zuhause, 15:45 muss ich los …", text: $command, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.black.opacity(0.035))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Button {
                    let value = command
                    command = ""
                    Task { await store.submit(value) }
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(LeonTheme.blue)
                        .clipShape(Circle())
                }
                .disabled(command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isProcessing)
                .opacity(command.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.45 : 1)
            }
        }
        .leonCard()
    }

    private func timeRange(_ block: DayBlock) -> String {
        let start = block.start.formatted(date: .omitted, time: .shortened)
        guard let end = block.end else { return start }
        return "\(start)–\(end.formatted(date: .omitted, time: .shortened))"
    }

    private func color(for kind: DayBlockKind) -> Color {
        switch kind {
        case .study: return LeonTheme.blue
        case .meal: return LeonTheme.orange
        case .travel: return LeonTheme.violet
        case .social: return LeonTheme.green
        case .workout: return LeonTheme.green
        default: return LeonTheme.secondary
        }
    }
}
