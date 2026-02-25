/**
 * Offline Data Sync Engine
 * High-performance message synchronization with delta compression
 * 
 * Features:
 * - Fast diff algorithm for message sync
 * - Delta compression
 * - Conflict resolution
 * - Efficient change detection
 * - Batch operations
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>

using namespace emscripten;

class SyncEngine {
private:
    struct Message {
        int id;
        std::string content;
        long long timestamp;
        std::string hash;
    };

    std::unordered_map<int, Message> localMessages;
    std::unordered_map<int, Message> remoteMessages;

    // Simple hash function for change detection
    std::string hashMessage(const std::string& content) {
        unsigned long hash = 5381;
        for (char c : content) {
            hash = ((hash << 5) + hash) + c;
        }
        return std::to_string(hash);
    }

    // Calculate edit distance for conflict resolution
    int editDistance(const std::string& s1, const std::string& s2) {
        int m = s1.length();
        int n = s2.length();
        std::vector<std::vector<int>> dp(m + 1, std::vector<int>(n + 1));

        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1[i-1] == s2[j-1]) {
                    dp[i][j] = dp[i-1][j-1];
                } else {
                    dp[i][j] = 1 + std::min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
                }
            }
        }

        return dp[m][n];
    }

public:
    SyncEngine() {}

    /**
     * Add message to local store
     */
    void addLocalMessage(int id, const std::string& content, long long timestamp) {
        Message msg;
        msg.id = id;
        msg.content = content;
        msg.timestamp = timestamp;
        msg.hash = hashMessage(content);
        localMessages[id] = msg;
    }

    /**
     * Add message to remote store
     */
    void addRemoteMessage(int id, const std::string& content, long long timestamp) {
        Message msg;
        msg.id = id;
        msg.content = content;
        msg.timestamp = timestamp;
        msg.hash = hashMessage(content);
        remoteMessages[id] = msg;
    }

    /**
     * Calculate differences between local and remote
     * Returns: [added_ids, modified_ids, deleted_ids]
     */
    val calculateDiff() {
        std::vector<int> added;
        std::vector<int> modified;
        std::vector<int> deleted;

        // Find added and modified messages
        for (const auto& pair : remoteMessages) {
            int id = pair.first;
            const Message& remoteMsg = pair.second;

            auto localIt = localMessages.find(id);
            if (localIt == localMessages.end()) {
                // New message on remote
                added.push_back(id);
            } else if (localIt->second.hash != remoteMsg.hash) {
                // Modified message
                modified.push_back(id);
            }
        }

        // Find deleted messages
        for (const auto& pair : localMessages) {
            int id = pair.first;
            if (remoteMessages.find(id) == remoteMessages.end()) {
                deleted.push_back(id);
            }
        }

        val result = val::object();
        result.set("added", val::array(added.begin(), added.end()));
        result.set("modified", val::array(modified.begin(), modified.end()));
        result.set("deleted", val::array(deleted.begin(), deleted.end()));

        return result;
    }

    /**
     * Generate delta for a modified message
     */
    std::string generateDelta(int id) {
        auto localIt = localMessages.find(id);
        auto remoteIt = remoteMessages.find(id);

        if (localIt == localMessages.end() || remoteIt == remoteMessages.end()) {
            return "";
        }

        const std::string& oldContent = localIt->second.content;
        const std::string& newContent = remoteIt->second.content;

        // Simple delta format: "pos:del:ins"
        std::string delta;
        size_t i = 0;

        // Find common prefix
        while (i < oldContent.length() && i < newContent.length() &&
               oldContent[i] == newContent[i]) {
            i++;
        }

        delta += std::to_string(i) + ":";

        // Find common suffix
        size_t oldEnd = oldContent.length();
        size_t newEnd = newContent.length();
        while (oldEnd > i && newEnd > i &&
               oldContent[oldEnd - 1] == newContent[newEnd - 1]) {
            oldEnd--;
            newEnd--;
        }

        // Deleted characters
        delta += std::to_string(oldEnd - i) + ":";

        // Inserted characters
        delta += newContent.substr(i, newEnd - i);

        return delta;
    }

    /**
     * Apply delta to message
     */
    std::string applyDelta(const std::string& content, const std::string& delta) {
        // Parse delta: "pos:del:ins"
        size_t firstColon = delta.find(':');
        size_t secondColon = delta.find(':', firstColon + 1);

        if (firstColon == std::string::npos || secondColon == std::string::npos) {
            return content; // Invalid delta
        }

        int pos = std::stoi(delta.substr(0, firstColon));
        int delCount = std::stoi(delta.substr(firstColon + 1, secondColon - firstColon - 1));
        std::string insertion = delta.substr(secondColon + 1);

        std::string result = content.substr(0, pos) + insertion;
        if (pos + delCount < content.length()) {
            result += content.substr(pos + delCount);
        }

        return result;
    }

    /**
     * Resolve conflict (simple last-write-wins)
     */
    val resolveConflict(int id) {
        auto localIt = localMessages.find(id);
        auto remoteIt = remoteMessages.find(id);

        val result = val::object();

        if (localIt == localMessages.end() || remoteIt == localMessages.end()) {
            result.set("resolved", false);
            return result;
        }

        // Use timestamp for resolution
        bool useRemote = remoteIt->second.timestamp > localIt->second.timestamp;
        
        result.set("resolved", true);
        result.set("useRemote", useRemote);
        result.set("winner", useRemote ? 
                   remoteIt->second.content : localIt->second.content);

        return result;
    }

    /**
     * Get sync statistics
     */
    val getStats() {
        val stats = val::object();
        stats.set("localCount", (int)localMessages.size());
        stats.set("remoteCount", (int)remoteMessages.size());

        int conflicts = 0;
        for (const auto& pair : localMessages) {
            int id = pair.first;
            auto remoteIt = remoteMessages.find(id);
            if (remoteIt != remoteMessages.end() &&
                pair.second.hash != remoteIt->second.hash) {
                conflicts++;
            }
        }
        stats.set("conflicts", conflicts);

        return stats;
    }

    /**
     * Clear all data
     */
    void clear() {
        localMessages.clear();
        remoteMessages.clear();
    }
};

EMSCRIPTEN_BINDINGS(sync_engine) {
    class_<SyncEngine>("SyncEngine")
        .constructor<>()
        .function("addLocalMessage", &SyncEngine::addLocalMessage)
        .function("addRemoteMessage", &SyncEngine::addRemoteMessage)
        .function("calculateDiff", &SyncEngine::calculateDiff)
        .function("generateDelta", &SyncEngine::generateDelta)
        .function("applyDelta", &SyncEngine::applyDelta)
        .function("resolveConflict", &SyncEngine::resolveConflict)
        .function("getStats", &SyncEngine::getStats)
        .function("clear", &SyncEngine::clear);
}
