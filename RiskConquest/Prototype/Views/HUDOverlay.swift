import SwiftUI

struct HUDOverlay: View {
    let selectedTerritory: String?
    let landedTerritory: String?
    let isAnimating: Bool
    let turnNumber: Int
    let activeFaction: String
    let reserveCount: Int
    let onReset: () -> Void
    let quickJump: (TerritoryID) -> Void

    var body: some View {
        VStack {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("worldDOMINATION")
                        .font(.headline)
                        .foregroundStyle(.white)

                    Text("Turn \(turnNumber) • \(activeFaction)")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.82))

                    Text("Reserves: \(reserveCount)")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.72))

                    if let selectedTerritory {
                        Text("Selected: \(selectedTerritory)")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.88))
                    }

                    if let landedTerritory {
                        Text("Landed: \(landedTerritory)")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }

                    if isAnimating {
                        Text("Fly-in in progress")
                            .font(.caption)
                            .foregroundStyle(.yellow)
                    }
                }

                Spacer()

                Button(action: onReset) {
                    Text("Reset")
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(.white.opacity(0.12))
                        .clipShape(Capsule())
                }
                .foregroundStyle(.white)
            }
            .padding()

            Spacer()

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(TerritoryID.allCases) { territory in
                        Button(action: { quickJump(territory) }) {
                            Text(territory.displayName)
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(.black.opacity(0.45))
                                .clipShape(Capsule())
                        }
                        .foregroundStyle(.white)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 20)
            }
        }
    }
}