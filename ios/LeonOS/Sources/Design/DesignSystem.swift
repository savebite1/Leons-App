import SwiftUI

enum LeonTheme {
    static let background = Color(red: 0.965, green: 0.972, blue: 0.985)
    static let surface = Color.white
    static let text = Color(red: 0.055, green: 0.065, blue: 0.085)
    static let secondary = Color(red: 0.39, green: 0.42, blue: 0.48)
    static let blue = Color(red: 0.10, green: 0.36, blue: 0.96)
    static let violet = Color(red: 0.45, green: 0.27, blue: 0.94)
    static let green = Color(red: 0.08, green: 0.62, blue: 0.40)
    static let orange = Color(red: 0.95, green: 0.48, blue: 0.12)
    static let line = Color.black.opacity(0.065)
}

struct LeonCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(LeonTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(LeonTheme.line, lineWidth: 1)
            }
            .shadow(color: Color.black.opacity(0.035), radius: 18, x: 0, y: 8)
    }
}

extension View {
    func leonCard() -> some View { modifier(LeonCard()) }
}

struct OSOrb: View {
    var size: CGFloat = 34

    var body: some View {
        Circle()
            .fill(
                AngularGradient(
                    colors: [LeonTheme.blue, LeonTheme.violet, Color.cyan, LeonTheme.blue],
                    center: .center
                )
            )
            .frame(width: size, height: size)
            .overlay(Circle().stroke(Color.white.opacity(0.65), lineWidth: 1))
            .shadow(color: LeonTheme.violet.opacity(0.24), radius: 12, x: 0, y: 5)
    }
}
