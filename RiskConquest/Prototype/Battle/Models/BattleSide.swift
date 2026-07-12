import Foundation

enum BattleSide: String, Codable, CaseIterable, Hashable {
    case attacker
    case defender

    var opposite: BattleSide {
        switch self {
        case .attacker: return .defender
        case .defender: return .attacker
        }
    }
}