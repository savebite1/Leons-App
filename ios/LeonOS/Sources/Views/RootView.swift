import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Heute", systemImage: "sparkles") }

            LearnView()
                .tabItem { Label("Lernen", systemImage: "book.closed") }

            OSView()
                .tabItem { Label("OS", systemImage: "circle.hexagongrid") }

            ProfileView()
                .tabItem { Label("Du", systemImage: "person.crop.circle") }
        }
        .tint(LeonTheme.blue)
    }
}
