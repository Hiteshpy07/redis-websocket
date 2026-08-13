import React from 'react'

function Chat() {
  return (
    <>
    {/* Floating Chat Toggle */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="absolute bottom-6 right-6 z-40 p-4 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-2xl transition-all font-sans font-bold flex items-center gap-2 active:scale-95"
      >
        💬 {isChatOpen ? "Close Discussion Chat" : "Open Chat Panel"}
        {chatLog.length > 0 && !isChatOpen && (
          <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {chatLog.length}
          </span>
        )}
      </button>

      {/* FLOATING ACTION CHAT PANEL MODAL */}
      {isChatOpen && (
        <div className="absolute bottom-24 right-6 z-40 w-96 h-[480px] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono animate-fade-in">
          <div className="p-3 bg-gray-950/80 border-b border-gray-800 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400">📝 Chat Stream Channels</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-950/20">
            {chatLog.length === 0 ? (
              <span className="text-xs italic text-gray-600 my-auto text-center">No logs generated. Send a message below.</span>
            ) : (
              chatLog.map((log, index) => {
                let sender = username;
                let msgBody = log;
                let imageSource = null;

                if (log.includes(": ")) {
                  const parts = log.split(": ");
                  sender = parts[0];
                  msgBody = parts.slice(1).join(": ");
                }

                const isMe = sender === username;

                if (msgBody.includes("[IMAGE_ATTACHMENT]")) {
                  const dataSegments = msgBody.split("[IMAGE_ATTACHMENT]");
                  msgBody = dataSegments[0];
                  imageSource = dataSegments[1];
                }

                return (
                  <div key={index} className={`max-w-[80%] rounded-lg p-2.5 text-xs border ${isMe ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-200 self-end" : "bg-gray-800 border-gray-700 text-gray-200 self-start"}`}>
                    <span className={`block text-[9px] font-bold mb-1 ${isMe ? "text-emerald-400" : "text-sky-400"}`}>{sender}</span>
                    
                    {imageSource && (
                      <img src={imageSource} alt="Shared media upload" className="max-w-full rounded border border-gray-700 mb-1.5 object-cover max-h-32 bg-gray-950" />
                    )}
                    
                    {msgBody.trim() && <span className="break-words">{msgBody}</span>}
                  </div>
                );
              })
            )}
          </div>

          {pendingImage && (
            <div className="p-2 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-2 animate-slide-up">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={pendingImage} alt="Preview thumbnail" className="w-10 h-10 object-cover rounded border border-sky-500/50" />
                <span className="text-[10px] text-gray-400 truncate italic">Ready to transmit image payload...</span>
              </div>
              <button 
                type="button"
                onClick={() => setPendingImage(null)} 
                className="text-[10px] bg-red-950/60 text-red-400 border border-red-900/40 hover:bg-red-900 px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="p-2 bg-gray-950/60 border-t border-gray-800 flex gap-2 items-center">
            <button
              type="button"
              onClick={handlefileupload}
              className="p-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-sky-400 rounded-md transition-colors active:scale-95"
              title="Upload Image Attachment"
            >
              📎
            </button>

            <input 
              type="text" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder={pendingImage ? "Add a caption..." : "Type a message..."} 
              className="flex-1 bg-gray-950 border border-gray-800 rounded-md p-2 text-xs text-gray-100 outline-none focus:border-sky-500" 
            />
            <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-8 px-4 rounded-md">
              SEND
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default Chat