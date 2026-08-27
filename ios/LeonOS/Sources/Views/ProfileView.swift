import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Du")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .tracking(-1)

                    VStack(alignment: .leading, spacing: 14) {
                        Text("Profil")
                            .font(.headline)
                        TextField("Name", text: $store.profile.name)
                            .textFieldStyle(.roundedBorder)
                    }
                    .leonCard()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("How you learn")
                            .font(.headline)
                        Text("Später trennt Leon OS hier Selbsteinschätzung von tatsächlich beobachteten Lernmustern — z. B. beste Tageszeit, sinnvolle Session-Länge und benötigte Wiederholungen.")
                            .font(.subheadline)
                            .foregroundStyle(LeonTheme.secondary)
                            .lineSpacing(3)
                    }
                    .leonCard()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Connected Data")
                            .font(.headline)
                        Text("Kalender, HealthKit, Schritte und weitere Datenquellen werden nur nach ausdrücklicher Freigabe verbunden und bleiben einzeln abschaltbar.")
                            .font(.subheadline)
                            .foregroundStyle(LeonTheme.secondary)
                            .lineSpacing(3)
                    }
                    .leonCard()
                }
                .padding(18)
            }
            .background(LeonTheme.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
