import SwiftUI

@main
struct RiskConquestApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            AppRouter()
                .environmentObject(appState)
                .environmentObject(appState.campaign)
        }
    }
}