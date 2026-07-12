import Foundation
import UIKit

enum BattleEnvironmentRegistry {
    static let arctic = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.07, green: 0.09, blue: 0.12, alpha: 1.0),
        horizonColor: UIColor(red: 0.10, green: 0.15, blue: 0.20, alpha: 1.0),
        ridgeColor: UIColor(red: 0.14, green: 0.18, blue: 0.23, alpha: 1.0),
        platformColor: UIColor(red: 0.20, green: 0.24, blue: 0.28, alpha: 1.0),
        platformStrokeColor: UIColor.white.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.cyan.withAlphaComponent(0.14),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.white,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let boreal = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.07, green: 0.10, blue: 0.08, alpha: 1.0),
        horizonColor: UIColor(red: 0.08, green: 0.14, blue: 0.11, alpha: 1.0),
        ridgeColor: UIColor(red: 0.10, green: 0.18, blue: 0.14, alpha: 1.0),
        platformColor: UIColor(red: 0.16, green: 0.22, blue: 0.18, alpha: 1.0),
        platformStrokeColor: UIColor.green.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.green.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemYellow,
        burstImpactColor: UIColor.systemMint,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let icyAtlantic = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.06, green: 0.08, blue: 0.12, alpha: 1.0),
        horizonColor: UIColor(red: 0.08, green: 0.11, blue: 0.17, alpha: 1.0),
        ridgeColor: UIColor(red: 0.12, green: 0.15, blue: 0.22, alpha: 1.0),
        platformColor: UIColor(red: 0.14, green: 0.18, blue: 0.25, alpha: 1.0),
        platformStrokeColor: UIColor.cyan.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemTeal.withAlphaComponent(0.18),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemCyan,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let easternCanada = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.09, green: 0.08, blue: 0.10, alpha: 1.0),
        horizonColor: UIColor(red: 0.14, green: 0.10, blue: 0.14, alpha: 1.0),
        ridgeColor: UIColor(red: 0.18, green: 0.13, blue: 0.18, alpha: 1.0),
        platformColor: UIColor(red: 0.22, green: 0.18, blue: 0.22, alpha: 1.0),
        platformStrokeColor: UIColor.systemPurple.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemPink.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemPink,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let equatorial = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.08, green: 0.11, blue: 0.09, alpha: 1.0),
        horizonColor: UIColor(red: 0.13, green: 0.16, blue: 0.11, alpha: 1.0),
        ridgeColor: UIColor(red: 0.18, green: 0.21, blue: 0.12, alpha: 1.0),
        platformColor: UIColor(red: 0.20, green: 0.24, blue: 0.14, alpha: 1.0),
        platformStrokeColor: UIColor.systemGreen.withAlphaComponent(0.28),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemGreen.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemYellow,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let europeanTheater = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.09, green: 0.09, blue: 0.12, alpha: 1.0),
        horizonColor: UIColor(red: 0.12, green: 0.13, blue: 0.18, alpha: 1.0),
        ridgeColor: UIColor(red: 0.16, green: 0.16, blue: 0.22, alpha: 1.0),
        platformColor: UIColor(red: 0.20, green: 0.20, blue: 0.26, alpha: 1.0),
        platformStrokeColor: UIColor.systemIndigo.withAlphaComponent(0.28),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemPurple.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemBlue,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let desert = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.14, green: 0.11, blue: 0.08, alpha: 1.0),
        horizonColor: UIColor(red: 0.19, green: 0.14, blue: 0.10, alpha: 1.0),
        ridgeColor: UIColor(red: 0.25, green: 0.18, blue: 0.11, alpha: 1.0),
        platformColor: UIColor(red: 0.28, green: 0.20, blue: 0.12, alpha: 1.0),
        platformStrokeColor: UIColor.systemOrange.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemYellow.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemRed,
        burstImpactColor: UIColor.systemYellow,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let steppe = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.09, green: 0.09, blue: 0.08, alpha: 1.0),
        horizonColor: UIColor(red: 0.12, green: 0.13, blue: 0.11, alpha: 1.0),
        ridgeColor: UIColor(red: 0.16, green: 0.17, blue: 0.13, alpha: 1.0),
        platformColor: UIColor(red: 0.19, green: 0.20, blue: 0.15, alpha: 1.0),
        platformStrokeColor: UIColor.systemBrown.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemTeal.withAlphaComponent(0.16),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemMint,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )

    static let pacific = BattleEnvironmentTheme(
        terrainBaseColor: UIColor(red: 0.05, green: 0.09, blue: 0.12, alpha: 1.0),
        horizonColor: UIColor(red: 0.06, green: 0.13, blue: 0.18, alpha: 1.0),
        ridgeColor: UIColor(red: 0.08, green: 0.17, blue: 0.21, alpha: 1.0),
        platformColor: UIColor(red: 0.10, green: 0.20, blue: 0.24, alpha: 1.0),
        platformStrokeColor: UIColor.systemTeal.withAlphaComponent(0.30),
        dividerColor: UIColor.white.withAlphaComponent(0.06),
        scanlineColor: UIColor.systemCyan.withAlphaComponent(0.18),
        burstAttackColor: UIColor.systemOrange,
        burstImpactColor: UIColor.systemCyan,
        outcomeTitleColor: UIColor.white,
        outcomeSubtitleColor: UIColor.white.withAlphaComponent(0.76)
    )
}