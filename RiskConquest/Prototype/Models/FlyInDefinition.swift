import Foundation

struct FlyInDefinition: Hashable {
    let territoryID: TerritoryID
    let duration: Double
    let keyframes: [FlyInKeyframe]
    let terrainBlend: [Double]
    let fog: [Double]
    let borderGlow: [Double]
    let uiFade: [Double]
    let landingOvershoot: Double
}