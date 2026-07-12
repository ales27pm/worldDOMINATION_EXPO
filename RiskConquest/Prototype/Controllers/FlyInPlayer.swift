import Foundation
import OSLog
import QuartzCore
import SceneKit
import simd

@MainActor
final class FlyInPlayer {
    private let logger = Logger(subsystem: "worldDOMINATION", category: "FlyInPlayer")

    private var displayLink: CADisplayLink?
    private var startTime: CFTimeInterval = 0
    private var definition: FlyInDefinition?
    private weak var cameraNode: SCNNode?
    private weak var cameraPivotNode: SCNNode?
    private weak var blendController: MapStyleBlendController?
    private var progressHandler: ((Double) -> Void)?
    private var completion: (() -> Void)?

    func play(
        definition: FlyInDefinition,
        cameraNode: SCNNode,
        cameraPivotNode: SCNNode,
        blendController: MapStyleBlendController,
        progressHandler: @escaping (Double) -> Void,
        completion: @escaping () -> Void
    ) {
        stop()

        self.definition = definition
        self.cameraNode = cameraNode
        self.cameraPivotNode = cameraPivotNode
        self.blendController = blendController
        self.progressHandler = progressHandler
        self.completion = completion
        startTime = CACurrentMediaTime()

        let link = CADisplayLink(target: self, selector: #selector(step))
        link.add(to: .main, forMode: .common)
        displayLink = link
        logger.debug("Started fly-in for \(definition.territoryID.rawValue, privacy: .public)")
    }

    func stop() {
        displayLink?.invalidate()
        displayLink = nil
        definition = nil
        progressHandler = nil
        completion = nil
    }

    @objc
    private func step() {
        guard let definition, let cameraNode, let cameraPivotNode else {
            logger.error("Fly-in step aborted because required SceneKit nodes were unavailable")
            stop()
            return
        }

        let elapsed = CACurrentMediaTime() - startTime
        let rawT = FlyInCurves.clamp01(elapsed / definition.duration)

        let shapedT: Double
        if rawT < 0.92 {
            shapedT = FlyInCurves.easeInOutCubic(rawT / 0.92) * 0.92
        } else {
            let tailT = (rawT - 0.92) / 0.08
            shapedT = 0.92 + FlyInCurves.easeOutBack(
                FlyInCurves.clamp01(tailT),
                s: definition.landingOvershoot
            ) * 0.08
        }

        let pose = interpolatedPose(at: shapedT, in: definition)
        cameraNode.position = SCNVector3(pose.position.x, pose.position.y, pose.position.z)
        cameraNode.camera?.fieldOfView = CGFloat(pose.fov)
        cameraPivotNode.look(at: SCNVector3(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z))

        blendController?.apply(progress: shapedT, definition: definition)
        progressHandler?(shapedT)

        if rawT >= 1.0 {
            let completion = self.completion
            logger.debug("Completed fly-in for \(definition.territoryID.rawValue, privacy: .public)")
            stop()
            completion?()
        }
    }

    private func interpolatedPose(at t: Double, in definition: FlyInDefinition) -> (position: SIMD3<Float>, lookAt: SIMD3<Float>, fov: Double) {
        let frames = definition.keyframes.sorted { $0.t < $1.t }

        guard let first = frames.first, let last = frames.last else {
            logger.warning("Fly-in definition for \(definition.territoryID.rawValue, privacy: .public) had no keyframes; using fallback pose")
            return (SIMD3<Float>(0, 120, 240), SIMD3<Float>(0, 0, 0), 38.0)
        }

        if t <= first.t {
            return (first.cameraPosition, first.lookAt, first.fov)
        }

        if t >= last.t {
            return (last.cameraPosition, last.lookAt, last.fov)
        }

        for index in 0..<(frames.count - 1) {
            let a = frames[index]
            let b = frames[index + 1]

            if t >= a.t && t <= b.t {
                let localT = Float((t - a.t) / (b.t - a.t))
                let position = GameMath.lerp(a.cameraPosition, b.cameraPosition, localT)
                let lookAt = GameMath.lerp(a.lookAt, b.lookAt, localT)
                let fov = GameMath.lerp(a.fov, b.fov, Double(localT))
                return (position, lookAt, fov)
            }
        }

        return (last.cameraPosition, last.lookAt, last.fov)
    }
}