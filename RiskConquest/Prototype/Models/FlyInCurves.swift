import Foundation

enum FlyInCurves {
    static func easeInOutCubic(_ t: Double) -> Double {
        if t < 0.5 {
            return 4.0 * t * t * t
        }

        return 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0
    }

    static func easeOutBack(_ t: Double, s: Double = 1.70158) -> Double {
        let x = t - 1.0
        return 1.0 + (s + 1.0) * pow(x, 3.0) + s * pow(x, 2.0)
    }

    static func clamp01(_ value: Double) -> Double {
        min(max(value, 0.0), 1.0)
    }
}