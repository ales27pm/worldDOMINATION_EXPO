import Foundation
import simd

enum TerritoryRegistry {
    static let all: [TerritoryID: FlyInDefinition] = [
        .alaska: FlyInDefinition(
            territoryID: .alaska,
            duration: 2.6,
            keyframes: [
                FlyInKeyframe(t: 0.0, cameraPosition: SIMD3<Float>(0, 120, 240), lookAt: SIMD3<Float>(0, 0, 0), fov: 38),
                FlyInKeyframe(t: 0.55, cameraPosition: SIMD3<Float>(-42, 78, 150), lookAt: SIMD3<Float>(-25, 16, 20), fov: 29),
                FlyInKeyframe(t: 1.0, cameraPosition: SIMD3<Float>(-56, 34, 74), lookAt: SIMD3<Float>(-52, 9, 2), fov: 21)
            ],
            terrainBlend: [0.0, 0.2, 0.55, 1.0],
            fog: [0.42, 0.28, 0.16, 0.08],
            borderGlow: [0.18, 0.28, 0.18, 0.0],
            uiFade: [0.0, 0.5, 0.88, 1.0],
            landingOvershoot: 1.3
        ),
        .greenland: FlyInDefinition(
            territoryID: .greenland,
            duration: 2.6,
            keyframes: [
                FlyInKeyframe(t: 0.0, cameraPosition: SIMD3<Float>(0, 120, 240), lookAt: SIMD3<Float>(0, 0, 0), fov: 38),
                FlyInKeyframe(t: 0.58, cameraPosition: SIMD3<Float>(18, 86, 154), lookAt: SIMD3<Float>(34, 28, 18), fov: 28),
                FlyInKeyframe(t: 1.0, cameraPosition: SIMD3<Float>(39, 44, 83), lookAt: SIMD3<Float>(44, 22, 7), fov: 20)
            ],
            terrainBlend: [0.0, 0.16, 0.5, 1.0],
            fog: [0.4, 0.3, 0.2, 0.1],
            borderGlow: [0.2, 0.3, 0.2, 0.0],
            uiFade: [0.0, 0.55, 0.92, 1.0],
            landingOvershoot: 1.25
        ),
        .ontario: FlyInDefinition(
            territoryID: .ontario,
            duration: 2.5,
            keyframes: [
                FlyInKeyframe(t: 0.0, cameraPosition: SIMD3<Float>(0, 120, 240), lookAt: SIMD3<Float>(0, 0, 0), fov: 38),
                FlyInKeyframe(t: 0.57, cameraPosition: SIMD3<Float>(10, 72, 148), lookAt: SIMD3<Float>(10, 6, 26), fov: 30),
                FlyInKeyframe(t: 1.0, cameraPosition: SIMD3<Float>(12, 31, 70), lookAt: SIMD3<Float>(15, 1, 6), fov: 22)
            ],
            terrainBlend: [0.0, 0.15, 0.48, 1.0],
            fog: [0.36, 0.25, 0.14, 0.06],
            borderGlow: [0.16, 0.26, 0.14, 0.0],
            uiFade: [0.0, 0.52, 0.9, 1.0],
            landingOvershoot: 1.2
        )
    ]

    static func definition(for territory: TerritoryID) -> FlyInDefinition? {
        all[territory]
    }
}