import Foundation
import UIKit

enum PrototypeBattleAssetFactory {
    static func makeRuntimeAsset(
        unitId: String,
        palette: UnitAtlasPalette
    ) throws -> BattleAnimationAsset {
        let bank = BattleAnimationBankFactory.makePrototypeBank(unitId: unitId)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        let jsonData = try encoder.encode(bank)
        let atlasImage = UnitAtlasFactory.makePrototypeAtlas(
            frameCount: bank.frames.count,
            palette: palette
        )

        return try BattleAnimationAssetLoader.load(
            jsonData: jsonData,
            atlasImage: atlasImage
        )
    }

    static func makeBundledOrRuntimeAsset(
        unitId: String,
        jsonResource: String,
        atlasResource: String,
        palette: UnitAtlasPalette,
        bundle: Bundle = .main
    ) -> BattleAnimationAsset {
        if let bundled = try? BattleAnimationAssetLoader.loadFromBundle(
            jsonResource: jsonResource,
            atlasResource: atlasResource,
            bundle: bundle
        ) {
            return bundled
        }

        do {
            return try makeRuntimeAsset(unitId: unitId, palette: palette)
        } catch {
            fatalError("Failed to build runtime asset for \(unitId): \(error)")
        }
    }
}