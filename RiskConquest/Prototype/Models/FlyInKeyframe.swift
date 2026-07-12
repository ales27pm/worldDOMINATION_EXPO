import Foundation
import simd

struct FlyInKeyframe: Hashable {
    let t: Double
    let cameraPosition: SIMD3<Float>
    let lookAt: SIMD3<Float>
    let fov: Double
}