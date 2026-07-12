import Observation

@preconcurrency import CoreMotion
import SwiftUI

@Observable
@MainActor
final class GyroscopeService {
    var isShaking: Bool = false
    var tiltX: Double = 0
    var tiltY: Double = 0
    var shakeDetected: Bool = false

    private let motionManager = CMMotionManager()
    private let queue = OperationQueue()
    private var lastShakeTime: Date = .distantPast
    private let shakeThreshold: Double = 2.5
    private var onShake: (() -> Void)?

    init() {
        queue.name = "com.riskconquest.motion"
        queue.maxConcurrentOperationCount = 1
    }

    func startMonitoring(onShake: @escaping () -> Void) {
        self.onShake = onShake
        guard motionManager.isDeviceMotionAvailable else { return }

        motionManager.deviceMotionUpdateInterval = 1.0 / 30.0
        motionManager.startDeviceMotionUpdates(to: queue) { [weak self] motion, _ in
            guard let motion else { return }

            let acc = motion.userAcceleration
            let magnitude = sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)

            let roll = motion.attitude.roll
            let pitch = motion.attitude.pitch

            Task { @MainActor in
                guard let self else { return }

                self.tiltX = pitch
                self.tiltY = roll

                if magnitude > self.shakeThreshold {
                    let now = Date()
                    if now.timeIntervalSince(self.lastShakeTime) > 0.8 {
                        self.lastShakeTime = now
                        self.shakeDetected = true
                        self.isShaking = true
                        self.onShake?()

                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 400_000_000)
                            self.isShaking = false
                        }
                    }
                }
            }
        }
    }

    func stopMonitoring() {
        motionManager.stopDeviceMotionUpdates()
        onShake = nil
    }
}