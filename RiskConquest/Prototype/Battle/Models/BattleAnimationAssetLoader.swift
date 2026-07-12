import CoreGraphics
import Foundation
import SpriteKit
import UIKit

enum BattleAnimationAssetError: Error {
    case missingJSONResource(String)
    case missingAtlasResource(String)
    case invalidAtlasImage
    case textureCropFailed(CGRect)
}

enum BattleAnimationAssetLoader {
    static func load(
        jsonData: Data,
        atlasImage: UIImage,
        decoder: JSONDecoder = JSONDecoder()
    ) throws -> BattleAnimationAsset {
        let bank = try decoder.decode(BattleAnimationBank.self, from: jsonData)
        let textures = try makeTextures(from: bank, atlasImage: atlasImage)
        return BattleAnimationAsset(bank: bank, textures: textures)
    }

    static func loadFromBundle(
        jsonResource: String,
        atlasResource: String,
        bundle: Bundle = .main
    ) throws -> BattleAnimationAsset {
        guard let jsonURL = bundle.url(forResource: jsonResource, withExtension: "json") else {
            throw BattleAnimationAssetError.missingJSONResource(jsonResource)
        }

        let jsonData = try Data(contentsOf: jsonURL)

        guard let atlasImage = UIImage(named: atlasResource, in: bundle, compatibleWith: nil) else {
            throw BattleAnimationAssetError.missingAtlasResource(atlasResource)
        }

        return try load(jsonData: jsonData, atlasImage: atlasImage)
    }

    private static func makeTextures(from bank: BattleAnimationBank, atlasImage: UIImage) throws -> [SKTexture] {
        guard let atlasCGImage = atlasImage.cgImage else {
            throw BattleAnimationAssetError.invalidAtlasImage
        }

        let imageScale = atlasImage.scale

        return try bank.frames.map { frame in
            let pixelRect = CGRect(
                x: CGFloat(frame.x) * imageScale,
                y: CGFloat(frame.y) * imageScale,
                width: CGFloat(frame.width) * imageScale,
                height: CGFloat(frame.height) * imageScale
            ).integral

            guard let cropped = atlasCGImage.cropping(to: pixelRect) else {
                throw BattleAnimationAssetError.textureCropFailed(pixelRect)
            }

            let texture = SKTexture(cgImage: cropped)
            texture.filteringMode = .nearest
            return texture
        }
    }
}