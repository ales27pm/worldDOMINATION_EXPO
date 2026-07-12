import SceneKit
import SwiftUI

@MainActor
struct WorldSceneView: UIViewRepresentable {
    @ObservedObject var controller: WorldSceneController

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView(frame: .zero)
        view.scene = controller.scene
        view.backgroundColor = .black
        view.allowsCameraControl = false
        view.isPlaying = true
        view.loops = true
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 60
        controller.attach(to: view)
        return view
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        if uiView.scene !== controller.scene {
            uiView.scene = controller.scene
        }
    }
}