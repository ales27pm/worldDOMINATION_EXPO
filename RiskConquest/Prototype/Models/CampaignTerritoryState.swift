import Foundation

struct CampaignTerritoryState: Identifiable, Codable, Hashable {
    let territory: TerritoryID
    var owner: FactionID
    var troops: TroopComposition
    var fortificationLevel: Int
    var supplyLevel: Double
    var morale: Double
    var productionValue: Int

    var id: TerritoryID { territory }

    var troopCountLabel: String {
        "\(troops.total)"
    }

    var defenceLabel: String {
        let total = troops.defensivePower + fortificationLevel * 4
        switch total {
        case ..<35: return "Thin"
        case ..<55: return "Holding"
        case ..<75: return "Fortified"
        default: return "Entrenched"
        }
    }

    var moralePercentLabel: String {
        "\(Int(round(morale * 100)))%"
    }

    var supplyPercentLabel: String {
        "\(Int(round(supplyLevel * 100)))%"
    }
}