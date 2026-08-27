import SwiftUI

struct OSView: View {
    @EnvironmentObject private var store: AppStore
    @State private var text = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                HStack(spacing: 12) {
                    OSOrb(size: 42)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Leon OS")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                        Text("Sag es normal. OS strukturiert den Rest.")
                            .font(.subheadline)
                            .foregroundStyle(LeonTheme.secondary)
                    }
                    Spacer()
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text(store.osMessage)
                        .font(.body)
                        .foregroundStyle(LeonTheme.text)
                        .lineSpacing(4)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .leonCard()

                Spacer()

                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Was ist heute los?", text: $text, axis: .vertical)
                        .lineLimit(1...5)
                        .padding(14)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay { RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(LeonTheme.line) }

                    Button {
                        let value = text
                        text = ""
                        Task { await store.submit(value) }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .background(LeonTheme.blue)
                            .clipShape(Circle())
                    }
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isProcessing)
                }
            }
            .padding(18)
            .background(LeonTheme.background.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
