import Foundation
import UIKit

enum FactionID: String, Codable, CaseIterable, Identifiable {
    case redEmpire
    case blueLeague
    case neutral

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .redEmpire:
            return "Red Empire"
        case .blueLeague:
            return "Blue League"
        case .neutral:
            return "Neutral"
        }
    }

    var mapColor: UIColor {
        switch self {
        case .redEmpire:
            return .systemRed
        case .blueLeague:
            return .systemBlue
        case .neutral:
            return .systemGray
        }
    }

    var attackerPalette: UnitAtlasPalette {
        switch self {
        case .redEmpire:
            return UnitAtlasPalette(
                bodyColor: .systemRed,
                visorColor: .systemOrange,
                weaponColor: .lightGray
            )
        case .blueLeague:
            return UnitAtlasPalette(
                bodyColor: .systemBlue,
                visorColor: .systemCyan,
                weaponColor: .white
            )
        case .neutral:
            return UnitAtlasPalette(
                bodyColor: .systemGray,
                visorColor: .white,
                weaponColor: .lightGray
            )
        }
    }

    var defenderPalette: UnitAtlasPalette {
        switch self {
        case .redEmpire:
            return UnitAtlasPalette(
                bodyColor: .systemRed,
                visorColor: .systemYellow,
                weaponColor: .white
            )
        case .blueLeague:
            return UnitAtlasPalette(
                bodyColor: .systemIndigo,
                visorColor: .systemMint,
                weaponColor: .white
            )
        case .neutral:
            return UnitAtlasPalette(
                bodyColor: .systemGray2,
                visorColor: .white,
                weaponColor: .white
            )
        }
    }
}