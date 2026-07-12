import Foundation

struct CampaignEvent: Identifiable, Hashable {
    let id: UUID
    let turn: Int
    let title: String
    let details: String
    let territory: TerritoryID?
    let timestamp: Date

    init(
        id: UUID = UUID(),
        turn: Int,
        title: String,
        details: String,
        territory: TerritoryID?,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.turn = turn
        self.title = title
        self.details = details
        self.territory = territory
        self.timestamp = timestamp
    }
}