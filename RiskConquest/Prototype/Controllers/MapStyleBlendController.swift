import Foundation
import SceneKit

@MainActor
final class MapStyleBlendController {
    weak var flatMapNode: SCNNode?
    weak var terrainNode: SCNNode?
    weak var fogNode: SCNNode?
    weak var borderGlowNode: SCNNode?

    func apply(progress: Double, definition: FlyInDefinition) {
        let terrainBlend = sampled(definition.terrainBlend, progress: progress)
        let fog = sampled(definition.fog, progress: progress)
        let borderGlow = sampled(definition.borderGlow, progress: progress)

        flatMapNode?.opacity = CGFloat(1.0 - terrainBlend)
        terrainNode?.opacity = CGFloat(terrainBlend)
        fogNode?.opacity = CGFloat(fog)
        borderGlowNode?.opacity = CGFloat(borderGlow)
    }

    func uiOpacity(progress: Double, definition: FlyInDefinition) -> Double {
        1.0 - sampled(definition.uiFade, progress: progress)
    }

    private func sampled(_ values: [Double], progress: Double) -> Double {
        guard !values.isEmpty else { return 0.0 }
        guard values.count > 1 else { return values[0] }

        let t = FlyInCurves.clamp01(progress)
        let scaled = t * Double(values.count - 1)
        let leftIndex = Int(floor(scaled))
        let rightIndex = min(leftIndex + 1, values.count - 1)
        let localT = scaled - Double(leftIndex)

        let a = values[leftIndex]
        let b = values[rightIndex]
        return a + (b - a) * localT
    }
}