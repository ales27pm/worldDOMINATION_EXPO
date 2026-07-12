import SwiftUI

struct PlayerColor {
    let primary: Color
    let name: String
}

enum PlayerColorOption: Int, CaseIterable, Sendable {
    case red, blue, green, yellow, purple, orange, cyan, pink

    var playerColor: PlayerColor {
        switch self {
        case .red: PlayerColor(primary: Color(red: 0.9, green: 0.2, blue: 0.2), name: "Red")
        case .blue: PlayerColor(primary: Color(red: 0.2, green: 0.4, blue: 0.9), name: "Blue")
        case .green: PlayerColor(primary: Color(red: 0.2, green: 0.75, blue: 0.3), name: "Green")
        case .yellow: PlayerColor(primary: Color(red: 0.95, green: 0.8, blue: 0.1), name: "Yellow")
        case .purple: PlayerColor(primary: Color(red: 0.6, green: 0.2, blue: 0.8), name: "Purple")
        case .orange: PlayerColor(primary: Color(red: 0.95, green: 0.5, blue: 0.1), name: "Orange")
        case .cyan: PlayerColor(primary: Color(red: 0.1, green: 0.8, blue: 0.8), name: "Cyan")
        case .pink: PlayerColor(primary: Color(red: 0.95, green: 0.3, blue: 0.6), name: "Pink")
        }
    }
}

struct Player: Identifiable, Sendable {
    let id: String
    let name: String
    let colorOption: PlayerColorOption
    let isHuman: Bool
    let generalID: GeneralID?
    var isAlive: Bool = true
    var cards: [RiskCard] = []
    var conqueredThisTurn: Bool = false
    var capital: TerritoryID?

    var color: Color { colorOption.playerColor.primary }
    var colorName: String { colorOption.playerColor.name }
}