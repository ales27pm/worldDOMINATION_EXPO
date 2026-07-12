import Foundation
import UIKit

enum TerritoryBattleRegistry {
    static func configuration(for territory: TerritoryID) -> TerritoryBattleConfiguration {
        switch territory {
        case .alaska:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Arctic Vanguard", id: "prototype_commander_red", maxHealth: 124, attack: 19, defense: 11, initiative: 17, minDamage: 15, maxDamage: 25),
                defenderTemplate: template("Blue Ice Bastion", id: "prototype_guard_blue", maxHealth: 136, attack: 14, defense: 15, initiative: 11, minDamage: 10, maxDamage: 20),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemOrange, weaponColor: .lightGray), defender: UnitAtlasPalette(bodyColor: .systemBlue, visorColor: .systemCyan, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.arctic,
                audio: BattleAudioCue(introSFX: "battle_intro_arctic", loopMusic: "battle_loop_arctic", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        case .northwestTerritory:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Timber Spearhead", id: "prototype_commander_red", maxHealth: 118, attack: 18, defense: 10, initiative: 16, minDamage: 14, maxDamage: 24),
                defenderTemplate: template("Blue Tundra Guard", id: "prototype_guard_blue", maxHealth: 134, attack: 15, defense: 14, initiative: 12, minDamage: 11, maxDamage: 21),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemYellow, weaponColor: .lightGray), defender: UnitAtlasPalette(bodyColor: .systemIndigo, visorColor: .systemCyan, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.boreal,
                audio: BattleAudioCue(introSFX: "battle_intro_boreal", loopMusic: "battle_loop_boreal", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        case .greenland:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Polar Raiders", id: "prototype_commander_red", maxHealth: 116, attack: 20, defense: 9, initiative: 18, minDamage: 16, maxDamage: 26),
                defenderTemplate: template("Blue Glacier Keep", id: "prototype_guard_blue", maxHealth: 142, attack: 14, defense: 16, initiative: 10, minDamage: 10, maxDamage: 19),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemOrange, weaponColor: .white), defender: UnitAtlasPalette(bodyColor: .systemBlue, visorColor: .systemTeal, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.icyAtlantic,
                audio: BattleAudioCue(introSFX: "battle_intro_glacier", loopMusic: "battle_loop_glacier", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        case .alberta:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Prairie Shockline", id: "prototype_commander_red", maxHealth: 122, attack: 17, defense: 12, initiative: 15, minDamage: 13, maxDamage: 23),
                defenderTemplate: template("Blue Frontier Hold", id: "prototype_guard_blue", maxHealth: 128, attack: 15, defense: 13, initiative: 13, minDamage: 11, maxDamage: 21),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemYellow, weaponColor: .lightGray), defender: UnitAtlasPalette(bodyColor: .systemBlue, visorColor: .systemMint, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.boreal,
                audio: BattleAudioCue(introSFX: "battle_intro_frontier", loopMusic: "battle_loop_frontier", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        case .ontario:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Dominion Spear", id: "prototype_commander_red", maxHealth: 120, attack: 18, defense: 11, initiative: 16, minDamage: 14, maxDamage: 24),
                defenderTemplate: template("Blue Shield Line", id: "prototype_guard_blue", maxHealth: 132, attack: 15, defense: 14, initiative: 12, minDamage: 11, maxDamage: 20),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemOrange, weaponColor: .lightGray), defender: UnitAtlasPalette(bodyColor: .systemBlue, visorColor: .systemCyan, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.boreal,
                audio: BattleAudioCue(introSFX: "battle_intro_ontario", loopMusic: "battle_loop_ontario", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        case .quebec:
            return TerritoryBattleConfiguration(
                territory: territory,
                attackerTemplate: template("Red Siege Column", id: "prototype_commander_red", maxHealth: 118, attack: 19, defense: 10, initiative: 17, minDamage: 15, maxDamage: 25),
                defenderTemplate: template("Blue Citadel Guard", id: "prototype_guard_blue", maxHealth: 138, attack: 14, defense: 15, initiative: 11, minDamage: 10, maxDamage: 20),
                paletteSet: BattlePaletteSet(attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: .systemOrange, weaponColor: .white), defender: UnitAtlasPalette(bodyColor: .systemIndigo, visorColor: .systemPurple, weaponColor: .white)),
                environment: BattleEnvironmentRegistry.easternCanada,
                audio: BattleAudioCue(introSFX: "battle_intro_quebec", loopMusic: "battle_loop_quebec", victorySFX: "victory_red", defeatSFX: "defeat_red")
            )
        default:
            return generatedConfiguration(for: territory)
        }
    }

    private static func generatedConfiguration(for territory: TerritoryID) -> TerritoryBattleConfiguration {
        let continent = MapData.territories[territory]?.continent ?? .northAmerica
        let environment = environment(for: territory, continent: continent)
        let colors = palette(for: territory, continent: continent)
        let attackBias = territory.rawValue.count % 4
        let defenseBias = territory.displayName.count % 4
        let speedBias = (MapData.territories[territory]?.neighbors.count ?? 3) % 4

        return TerritoryBattleConfiguration(
            territory: territory,
            attackerTemplate: template(
                "Red \(territory.displayName) Spear",
                id: "prototype_commander_red",
                maxHealth: 118 + defenseBias * 2,
                attack: 17 + attackBias,
                defense: 10 + defenseBias,
                initiative: 14 + speedBias,
                minDamage: 13 + min(attackBias, 2),
                maxDamage: 23 + attackBias
            ),
            defenderTemplate: template(
                "Blue \(territory.displayName) Guard",
                id: "prototype_guard_blue",
                maxHealth: 128 + defenseBias * 4,
                attack: 14 + speedBias,
                defense: 13 + defenseBias,
                initiative: 11 + attackBias,
                minDamage: 10 + min(speedBias, 2),
                maxDamage: 20 + defenseBias
            ),
            paletteSet: colors,
            environment: environment,
            audio: BattleAudioCue(
                introSFX: "battle_intro_\(territory.rawValue)",
                loopMusic: "battle_loop_\(continent.rawValue)",
                victorySFX: "victory_red",
                defeatSFX: "defeat_red"
            )
        )
    }

    private static func template(_ displayName: String, id: String, maxHealth: Int, attack: Int, defense: Int, initiative: Int, minDamage: Int, maxDamage: Int) -> BattleUnitTemplate {
        BattleUnitTemplate(
            displayName: displayName,
            unitId: id,
            stats: BattleUnitStats(
                maxHealth: maxHealth,
                attack: attack,
                defense: defense,
                initiative: initiative,
                minDamage: minDamage,
                maxDamage: maxDamage
            )
        )
    }

    private static func environment(for territory: TerritoryID, continent: ContinentID) -> BattleEnvironmentTheme {
        switch territory {
        case .hawaii, .japan, .philippines, .indonesia, .newGuinea, .westernAustralia, .easternAustralia, .newZealand:
            return BattleEnvironmentRegistry.pacific
        case .iceland, .svalbard:
            return BattleEnvironmentRegistry.icyAtlantic
        default:
            switch continent {
            case .northAmerica: return BattleEnvironmentRegistry.boreal
            case .southAmerica: return BattleEnvironmentRegistry.equatorial
            case .europe: return BattleEnvironmentRegistry.europeanTheater
            case .africa: return BattleEnvironmentRegistry.desert
            case .asia: return BattleEnvironmentRegistry.steppe
            case .australia: return BattleEnvironmentRegistry.pacific
            }
        }
    }

    private static func palette(for territory: TerritoryID, continent: ContinentID) -> BattlePaletteSet {
        let attackerVisor: UIColor
        let defenderBody: UIColor
        let defenderVisor: UIColor

        switch continent {
        case .northAmerica:
            attackerVisor = .systemOrange; defenderBody = .systemBlue; defenderVisor = .systemCyan
        case .southAmerica:
            attackerVisor = .systemYellow; defenderBody = .systemTeal; defenderVisor = .systemMint
        case .europe:
            attackerVisor = .systemPink; defenderBody = .systemIndigo; defenderVisor = .systemPurple
        case .africa:
            attackerVisor = .systemOrange; defenderBody = .systemBrown; defenderVisor = .systemYellow
        case .asia:
            attackerVisor = .systemYellow; defenderBody = .systemIndigo; defenderVisor = .systemTeal
        case .australia:
            attackerVisor = .systemMint; defenderBody = .systemBlue; defenderVisor = .systemCyan
        }

        let weaponColor: UIColor = territory.isExtra ? .white : .lightGray

        return BattlePaletteSet(
            attacker: UnitAtlasPalette(bodyColor: .systemRed, visorColor: attackerVisor, weaponColor: weaponColor),
            defender: UnitAtlasPalette(bodyColor: defenderBody, visorColor: defenderVisor, weaponColor: .white)
        )
    }
}