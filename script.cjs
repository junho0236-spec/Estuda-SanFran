const fs = require('fs');

const content = fs.readFileSync('App.tsx', 'utf8');

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('{currentView === View.Dashboard && ('));
const endIdx = lines.findIndex(l => l.includes('{currentView === View.Tasks && <Tasks'));

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find block');
  process.exit(1);
}

let block = lines.slice(startIdx, endIdx + 1).join('\n');

// Replace {currentView === View.X && <X />} with <Route path={getPathFromView(View.X)} element={<X />} />
// We need to handle multi-line components too.
// Actually, since currentView is derived from location.pathname, we can just wrap the whole block in a single <Routes><Route path="*" element={<> ... </>} /></Routes>.
// But the user wants us to REPLACE the conditional logic with Routes and Route.

// Let's use regex to replace {currentView === View.X && ( ... )}
// and {currentView === View.X && <X ... />}

block = block.replace(/\{currentView === View\.([A-Za-z0-9_]+) && \(([\s\S]*?)\)\}/g, '<Route path={getPathFromView(View.$1)} element={$2} />');
block = block.replace(/\{currentView === View\.([A-Za-z0-9_]+) && (<[A-Za-z0-9_]+[^>]*\/>)\}/g, '<Route path={getPathFromView(View.$1)} element={$2} />');

// Special cases like {currentView === View.NoteView && selectedSubjectIdForNotes && ( ... )}
block = block.replace(/\{currentView === View\.([A-Za-z0-9_]+) && ([a-zA-Z0-9_]+) && \(([\s\S]*?)\)\}/g, '<Route path={getPathFromView(View.$1)} element={$2 ? $3 : null} />');
block = block.replace(/\{currentView === View\.([A-Za-z0-9_]+) && ([a-zA-Z0-9_]+) && (<[A-Za-z0-9_]+[^>]*\/>)\}/g, '<Route path={getPathFromView(View.$1)} element={$2 ? $3 : null} />');

// Add specific aliases requested by user
const aliases = `
                <Route path="/simulados" element={<QuestionBank userId={session.user.id} onCorrectAnswer={incrementCorrectQuestions} folders={folders} flashcards={flashcards} />} />
`;

const newBlock = `<Routes>\n${block}\n${aliases}\n              </Routes>`;

const newContent = lines.slice(0, startIdx).join('\n') + '\n' + newBlock + '\n' + lines.slice(endIdx + 1).join('\n');

fs.writeFileSync('App.tsx', newContent);
console.log('Done');
