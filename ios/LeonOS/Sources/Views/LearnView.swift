import SwiftUI

struct LearnView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Lernen")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .tracking(-1)

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Learning Intelligence")
                            .font(.headline)
                        Text("Hier landen später deine echten Themen, Buchseiten und PROVE-IT-Ergebnisse. Ein Thema gilt nicht als sicher, nur weil du es im Chat verstanden hast.")
                            .font(.subheadline)
                            .foregroundStyle(LeonTheme.secondary)
                            .lineSpacing(3)
                    }
                    .leonCard()

                    if store.topics.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Noch keine Lerndaten")
                                .font(.headline)
                            Text("V6 startet ohne Demo-Fächer oder erfundene Prozentwerte.")
                                .font(.subheadline)
                                .foregroundStyle(LeonTheme.secondary)
                        }
                        .leonCard()
                    }
                }
                .padding(18)
            }
            .background(LeonTheme.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
