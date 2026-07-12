import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var selectedTerritory: TerritoryID?
    @Published var lastLandedTerritory: TerritoryID?
    let campaign = CampaignWorldState()
}