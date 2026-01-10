
import os

filePath = r"D:\RITP\src\components\RegistrationPage.tsx"

clean_step3 = r"""                          {/* Step 3: Payment & Declaration */}
                          {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right">
                              
                              {/* Free Event Badge */}
                              {selectedEvent && selectedEvent.registration_fee === 0 && (
                                <div className="p-6 bg-gradient-to-br from-green-950/30 to-black border border-green-500/30 rounded-xl text-center">
                                  <div className="text-4xl mb-3">🎉</div>
                                  <h3 className="text-xl font-semibold text-green-400 mb-2">Free Event!</h3>
                                  <p className="text-zinc-400">There is no registration fee for this event.</p>
                                  <div className="mt-4 p-3 bg-green-950/50 rounded-lg">
                                    <p className="text-green-300 font-medium">{selectedEvent.name}</p>
                                    <p className="text-xs text-zinc-500">{selectedEvent.category} • {selectedEvent.event_type === 'team' ? 'Team Event' : 'Individual'}</p>
                                  </div>
                                </div>
                              )}

                              {/* Paid Event Banner */}
                              {selectedEvent && selectedEvent.registration_fee > 0 && (
                                <div className="space-y-6 p-6 bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-black border border-amber-500/30 rounded-xl">
                                  <div className="flex items-center justify-between">
                                      <h3 className="text-lg font-semibold text-amber-400">Paid Event</h3>
                                      <div className="text-3xl font-bold text-white">
                                        ₹{selectedEvent.registration_fee}
                                      </div>
                                  </div>
                                  
                                  <div className="p-5 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/30">
                                      <div className="flex items-start gap-4">
                                        <div className="p-3 bg-yellow-500/20 rounded-full flex-shrink-0">
                                          <Zap className="w-6 h-6 text-yellow-500" />
                                        </div>
                                        <div className="space-y-3">
                                          <h4 className="font-bold text-yellow-400 text-lg">First Come, First Serve</h4>
                                          <p className="text-white/80 leading-relaxed">
                                            Register now to secure your spot! After you submit this registration, we will contact you shortly via email with the payment link.
                                          </p>
                                          <div className="flex items-center gap-2 text-yellow-300 font-medium text-sm">
                                            <span>🎯</span>
                                            <span>Our motto: Give every student a fair chance with proper time to register!</span>
                                          </div>
                                        </div>
                                      </div>
                                  </div>
                                </div>
                              )}

                              {/* How it Works */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                      <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-500" /> How it works:
                                      </h5>
                                      <ol className="text-sm text-zinc-400 space-y-2">
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">1</span>
                                          <span>Complete your registration below</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">2</span>
                                          <span>We'll review and send you a payment link</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">3</span>
                                          <span>Pay within the given time to confirm your spot</span>
                                        </li>
                                      </ol>
                                      
                                      <div className="mt-4 p-4 bg-green-950/30 rounded-lg border border-green-500/30">
                                          <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            <div>
                                              <p className="text-green-400 font-medium">What happens next?</p>
                                              <p className="text-sm text-zinc-400">
                                                You'll receive an email with payment details and a link to complete your registration.
                                              </p>
                                            </div>
                                          </div>
                                      </div>
                                    </div>

                              {/* Declaration */}
                              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id="declaration"
                                    checked={formData.declaration}
                                    onChange={(e) => handleChange('declaration', e.target.checked.toString())}
                                    required
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-red-600 focus:ring-red-500/50"
                                  />
                                  <Label htmlFor="declaration" className="text-sm cursor-pointer text-zinc-300 leading-relaxed select-none">
                                    I hereby declare that the information provided above is true to the best of my knowledge.
                                    I agree to abide by the rules and regulations of the event, and I accept the <a href="/terms" target="_blank" className="text-blue-400 hover:underline">Terms & Conditions</a>, <a href="/refund" target="_blank" className="text-blue-400 hover:underline">Refund Policy</a>, and <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>.
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )}

"""

with open(filePath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if "{/* Step 3: Payment & Declaration */}" in line:
        start_index = i
    if "{/* Navigation Buttons */}" in line:
        end_index = i
        break

if start_index != -1 and end_index != -1:
    new_lines = lines[:start_index] + [clean_step3] + lines[end_index:]
    with open(filePath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully rewritten Step 3.")
else:
    print(f"Could not find markers. Start: {start_index}, End: {end_index}")
