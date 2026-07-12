import Foundation

struct TerritoryLandingContext {
    let territory: TerritoryID
    let territoryState: CampaignTerritoryState
    let hostileNeighbours: [CampaignTerritoryState]
    let encounter: BattleEncounterBlueprint?

    var battleAvailable: Bool {
        encounter != nil
    }

    var hostilePressureLabel: String {
        let hostilePower = hostileNeighbours.reduce(0) { $0 + $1.troops.offensivePower }
        switch hostilePower {
        case ..<20:
            return "Low"
        case ..<40:
            return "Moderate"
        case ..<65:
            return "High"
        default:
            return "Severe"
        }
    }
}