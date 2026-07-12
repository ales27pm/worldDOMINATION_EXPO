import CoreGraphics
import Foundation

struct SpriteFrameDefinition: Codable, Hashable, Identifiable {
    let id: Int
    let atlasName: String
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let pivotX: Int
    let pivotY: Int

    var rect: CGRect {
        CGRect(x: x, y: y, width: width, height: height)
    }
}