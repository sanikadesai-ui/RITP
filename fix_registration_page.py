
import os

filePath = r"D:\RITP\src\components\RegistrationPage.tsx"

clean_map_block = r"""                                    {events.map((event) => {
                                      const regStatus = getEventRegistrationStatus(event);
                                      const isLocked = !regStatus.isOpen;
                                      
                                      return (
                                        <SelectItem
                                          key={event.id}
                                          value={event.id}
                                          disabled={isLocked}
                                          className={`py-4 px-3 border-b border-red-900/20 last:border-0 transition-colors ${
                                            isLocked 
                                              ? 'opacity-60 cursor-not-allowed bg-zinc-900/50' 
                                              : 'focus:bg-red-900/30 hover:bg-red-900/20 cursor-pointer'
                                          }`}
                                        >
                                          <div className="flex flex-col gap-1.5 w-full">
                                            <div className="flex items-center gap-2">
                                              {isLocked && <Lock className="w-4 h-4 text-yellow-500" />}
                                              <span className={`font-semibold text-base ${isLocked ? 'text-zinc-400' : 'text-red-100'}`}>
                                                {event.name}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/40 text-red-300 border border-red-800/50">
                                                {event.category}
                                              </span>
                                              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                                                {event.event_type === 'team' ? '👥 Team' : '👤 Solo'}
                                              </span>
                                              {isLocked ? (
                                                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {regStatus.message}
                                                </span>
                                              ) : (
                                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${event.registration_fee > 0
                                                  ? 'bg-orange-900/30 text-orange-300 border-orange-700/50'
                                                  : 'bg-green-900/30 text-green-300 border-green-700/50'
                                                }`}>
                                                  {event.registration_fee > 0 ? `₹${event.registration_fee}` : '✨ Free'}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
"""

with open(filePath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_index = -1
end_index = -1

# Look for <SelectContent> and </SelectContent>
for i, line in enumerate(lines):
    if "<SelectContent" in line:
        start_index = i
    if "</SelectContent>" in line and start_index != -1 and i > start_index:
        # Find the first closing tag after start_index?
        # There might be multiple SelectContents.
        # I need to target the one with events.map mess.
        # Let's verify if the block between start and i contains "events.map"
        block = "".join(lines[start_index:i])
        if "events.map" in block:
            end_index = i
            break
        else:
             # Reset start_index if this block didn't match (e.g. earlier select content)
             pass 

if start_index != -1 and end_index != -1:
    # Keep the <SelectContent> line (lines[start_index])
    # Keep the </SelectContent> line (lines[end_index])
    # Replace everything between them.
    
    new_lines = lines[:start_index+1] + [clean_map_block] + lines[end_index:]
    with open(filePath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully rewritten SelectContent map block.")
else:
    print(f"Could not find start ({start_index}) or end ({end_index}) markers for SelectContent.")
