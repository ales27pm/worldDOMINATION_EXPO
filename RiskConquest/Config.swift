import Foundation

/// Centralized runtime configuration values for the app target.
///
/// Keeping these values in one file prevents build failures when the project
/// expects `Config.swift` to exist and makes environment-specific toggles easy
/// to locate.
enum AppConfig {
    /// The app's display name as configured in Info.plist.
    static var appName: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
            ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String
            ?? "RiskConquest"
    }

    /// The semantic app version (CFBundleShortVersionString).
    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0"
    }

    /// The build number (CFBundleVersion).
    static var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0"
    }

    /// Combined version string suitable for debug/diagnostics UI.
    static var versionDescription: String {
        "\(appVersion) (\(buildNumber))"
    }
}