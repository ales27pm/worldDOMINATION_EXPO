import Foundation

struct BattleOddsEstimate {
    let attackerWinProbability: Double
    let expectedRounds: Int
    let projectedAttackerLosses: Int
    let projectedDefenderLosses: Int

    var winPercentText: String {
        "\(Int(round(attackerWinProbability * 100)))%"
    }

    var pressureLabel: String {
        switch attackerWinProbability {
        case ..<0.35:
            return "Unfavourable"
        case ..<0.48:
            return "Risky"
        case ..<0.58:
            return "Contested"
        case ..<0.72:
            return "Advantage"
        default:
            return "Strong Advantage"
        }
    }
}