import Foundation

enum CardType: String, CaseIterable, Codable, Sendable {
    case infantry
    case cavalry
    case artillery
    case wild
}

struct RiskCard: Identifiable, Sendable {
    let id = UUID()
    let type: CardType
    let territoryID: TerritoryID?

    var symbolName: String {
        switch type {
        case .infantry: "figure.stand"
        case .cavalry: "figure.equestrian.sports"
        case .artillery: "circle.hexagongrid.fill"
        case .wild: "star.fill"
        }
    }
}