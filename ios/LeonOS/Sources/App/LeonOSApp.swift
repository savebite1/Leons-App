import SwiftUI

@main
struct LeonOSApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.light)
        }
    }
}
