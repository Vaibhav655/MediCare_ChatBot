const chatContent = document.querySelector(".chat-content");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const darkModeToggle = document.querySelector("#dark-mode-toggle");
const clearChat = document.querySelector("#clear-chat");
const voiceInput = document.querySelector("#voice-input");
const stopResponse = document.querySelector("#stop-response");
const chatForm = document.querySelector(".chat-form");
const promptButtons = document.querySelectorAll(".prompt-button");

// API setup
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${OPENAI_API_KEY}`;

// Initial welcome message with markdown
const welcomeMessageText = `
# Welcome to MediBot! 🤖

I'm your **AI-powered healthcare assistant**, created by **Vaibhav** to help you with medical questions and healthcare information.

## How Can I Help You? 🏥

I can assist you with:
- Medical information and symptoms
- Treatment suggestions
- Medicine information
- General health guidance
- Basic first aid advice

## Important Disclaimer ⚠️

My responses include real-time web search results for medical queries, but they are for **informational purposes only**. **Always consult a healthcare professional for specific medical advice.**

## Example Questions 💡

Try asking about:
- What are common cold remedies?
- How to treat a headache?
- Basic first aid for burns
- Tips for better sleep

**Ready to help!** Type your medical question below to get started! 🚀
`;

// Initialize user message
const userData = { message: null };
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// Initialize speech recognition
let recognition = null;
let isRecording = false;

// Flag to control response generation
let isGeneratingResponse = false;
let stopTyping = false;

// Check if browser supports speech recognition
const checkSpeechRecognition = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

// Setup speech recognition
const setupSpeechRecognition = () => {
  if (!checkSpeechRecognition()) {
    console.log('Speech recognition not supported');
    voiceInput.style.display = 'none';
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onstart = () => {
    isRecording = true;
    chatForm.classList.add('recording');
    messageInput.placeholder = "Listening...";
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    messageInput.dispatchEvent(new Event('input'));
  };
  
  recognition.onend = () => {
    isRecording = false;
    chatForm.classList.remove('recording');
    messageInput.placeholder = "Ask MediBot anything...";
    
    if (messageInput.value.trim() !== '') {
      setTimeout(() => handleOutgoingMessage(new Event('submit')), 500);
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    isRecording = false;
    chatForm.classList.remove('recording');
    messageInput.placeholder = "Ask MediBot anything...";
  };
};

// Toggle voice input
const toggleVoiceInput = () => {
  if (!recognition) return;
  
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
  }
};

// Create message element
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = `<div class="message-text">${content}</div>`;
  return div;
};

// Function to create a code block with copy button
const createCodeBlock = (code, language = '') => {
  const container = document.createElement('div');
  container.className = 'code-block-container';
  
  const header = document.createElement('div');
  header.className = 'code-block-header';
  
  const langSpan = document.createElement('span');
  langSpan.className = 'code-block-language';
  langSpan.textContent = language || 'code';
  
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.textContent = 'Copy';
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('copied');
      setTimeout(() => {
        copyButton.textContent = 'Copy';
        copyButton.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  header.appendChild(langSpan);
  header.appendChild(copyButton);
  
  const pre = document.createElement('pre');
  const codeElement = document.createElement('code');
  codeElement.textContent = code;
  pre.appendChild(codeElement);
  
  container.appendChild(header);
  container.appendChild(pre);
  
  return container.outerHTML;
};

// Generate bot response
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");
  
  sendMessage.disabled = true;
  stopResponse.style.display = 'flex';
  isGeneratingResponse = true;
  stopTyping = false;
  
  // Check if it's a code generation request
  const codeKeywords = ['code', 'program', 'function', 'script', 'example', 'implement', 'write', 'create'];
  const programmingLanguages = ['python', 'javascript', 'java', 'c++', 'php', 'html', 'css', 'sql', 'react', 'node'];
  
  const isCodeRequest = codeKeywords.some(keyword => userData.message.toLowerCase().includes(keyword)) &&
                       programmingLanguages.some(lang => userData.message.toLowerCase().includes(lang));
  
  // Check if the message is medical-related
  const medicalKeywords = [
    // General medical terms
    'medicine', 'medical', 'health', 'healthcare', 'disease', 'illness', 'condition',
    'symptom', 'treatment', 'therapy', 'cure', 'healing', 'recovery',
    'doctor', 'physician', 'hospital', 'clinic', 'emergency',
    'pain', 'ache', 'discomfort', 'diagnosis', 'prescription', 'medication',
    'pathology', 'prognosis', 'syndrome', 'disorder', 'ailment', 'malady',
    
    // Body parts and systems
    'head', 'chest', 'stomach', 'back', 'throat', 'nose', 'ear', 'eye', 'mouth',
    'heart', 'lung', 'liver', 'kidney', 'brain', 'muscle', 'bone', 'joint',
    'skin', 'blood', 'nerve', 'immune system', 'digestive', 'respiratory',
    'cardiovascular', 'skeletal', 'muscular', 'endocrine', 'lymphatic',
    'reproductive', 'urinary', 'pancreas', 'gallbladder', 'intestine', 'colon',
    'spine', 'spinal', 'vertebrae', 'ligament', 'tendon', 'tissue', 'cell',
    'artery', 'vein', 'capillary', 'gland', 'hormone', 'enzyme',
    
    // Common symptoms
    'fever', 'cough', 'cold', 'flu', 'headache', 'migraine', 'nausea',
    'vomiting', 'diarrhea', 'constipation', 'rash', 'swelling', 'inflammation',
    'infection', 'allergy', 'dizzy', 'fatigue', 'tired', 'exhaustion',
    'insomnia', 'sleep', 'anxiety', 'depression', 'stress', 'vertigo',
    'numbness', 'tingling', 'itching', 'burning', 'cramping', 'spasm',
    'tremor', 'seizure', 'fainting', 'blackout', 'unconscious', 'dehydration',
    'chills', 'sweating', 'weight loss', 'weight gain', 'appetite',
    'breathing difficulty', 'shortness of breath', 'wheezing', 'congestion',
    
    // Medical procedures
    'surgery', 'operation', 'examination', 'test', 'scan', 'x-ray', 'mri',
    'ultrasound', 'vaccination', 'vaccine', 'immunization', 'injection',
    'prescription', 'dose', 'dosage', 'tablet', 'capsule', 'syrup',
    'biopsy', 'chemotherapy', 'radiation', 'dialysis', 'transplant',
    'transfusion', 'bypass', 'implant', 'catheter', 'endoscopy', 'colonoscopy',
    'mammogram', 'pap smear', 'blood test', 'urine test', 'stool test',
    'genetic testing', 'screening', 'lab work', 'pathology',
    
    // First aid terms
    'first aid', 'emergency', 'wound', 'cut', 'burn', 'bruise', 'fracture',
    'sprain', 'strain', 'bleeding', 'bandage', 'dressing', 'antiseptic',
    'cpr', 'heimlich', 'resuscitation', 'defibrillator', 'splint',
    'tourniquet', 'gauze', 'compression', 'sterilize', 'disinfect',
    
    // Lifestyle and prevention
    'diet', 'nutrition', 'exercise', 'fitness', 'wellness', 'prevention',
    'hygiene', 'sanitize', 'vitamin', 'mineral', 'supplement',
    'immunization', 'vaccination', 'screening', 'checkup', 'lifestyle',
    'meditation', 'mindfulness', 'relaxation', 'stress management',
    'sleep hygiene', 'balanced diet', 'hydration', 'exercise routine',
    
    // Mental health
    'mental health', 'anxiety', 'depression', 'stress', 'therapy', 'counseling',
    'psychiatric', 'psychological', 'mental', 'emotional', 'behavioral',
    'bipolar', 'schizophrenia', 'ptsd', 'ocd', 'adhd', 'autism',
    'eating disorder', 'addiction', 'substance abuse', 'panic attack',
    'phobia', 'trauma', 'personality disorder', 'mood disorder',
    
    // Chronic conditions
    'diabetes', 'hypertension', 'asthma', 'arthritis', 'cancer',
    'heart disease', 'stroke', 'obesity', 'allergies', 'chronic',
    'multiple sclerosis', 'parkinsons', 'alzheimers', 'dementia',
    'lupus', 'fibromyalgia', 'chronic fatigue', 'epilepsy', 'osteoporosis',
    'celiac', 'crohns', 'colitis', 'psoriasis', 'eczema', 'rosacea',
    'thyroid', 'gout', 'anemia', 'hiv', 'aids', 'hepatitis',
    
    // Medical specialties
    'cardiology', 'neurology', 'pediatrics', 'orthopedics', 'dermatology',
    'gynecology', 'urology', 'psychiatry', 'dentistry', 'ophthalmology',
    'endocrinology', 'gastroenterology', 'oncology', 'rheumatology',
    'pulmonology', 'nephrology', 'hematology', 'immunology', 'allergist',
    'otolaryngology', 'podiatry', 'chiropractic', 'physiotherapy',
    'obstetrics', 'neonatology', 'geriatrics', 'palliative',
    
    // Alternative medicine
    'herbal', 'ayurveda', 'homeopathy', 'acupuncture', 'naturopathy',
    'holistic', 'traditional medicine', 'alternative medicine',
    'chinese medicine', 'aromatherapy', 'reflexology', 'reiki',
    'massage therapy', 'osteopathy', 'herbalism', 'meditation',
    'yoga therapy', 'tai chi', 'qigong', 'supplements',
    
    // Medical emergencies
    'emergency', 'urgent', 'critical', 'ambulance', 'paramedic',
    'first responder', 'intensive care', 'icu', 'trauma',
    'heart attack', 'stroke', 'seizure', 'anaphylaxis', 'poisoning',
    'overdose', 'choking', 'drowning', 'shock', 'concussion',
    'severe bleeding', 'respiratory failure', 'cardiac arrest',
    
    // Medical equipment
    'wheelchair', 'crutches', 'walker', 'inhaler', 'thermometer',
    'blood pressure', 'glucose', 'monitor', 'medical device',
    'oxygen tank', 'nebulizer', 'cpap', 'hearing aid', 'pacemaker',
    'prosthetic', 'orthotic', 'syringe', 'stethoscope', 'defibrillator',
    
    // Medications and drug types
    'antibiotic', 'antiviral', 'antifungal', 'antihistamine',
    'painkiller', 'analgesic', 'nsaid', 'steroid', 'insulin',
    'vaccine', 'sedative', 'antidepressant', 'antipsychotic',
    'blood thinner', 'diuretic', 'laxative', 'supplement',
    
    // Laboratory and diagnostics
    'blood test', 'urine test', 'stool test', 'biopsy',
    'culture', 'sensitivity', 'marker', 'titer', 'screening',
    'genetic test', 'antibody test', 'hormone level', 'enzyme test',
    'cholesterol', 'glucose test', 'hemoglobin', 'white blood cell',
    
    // Reproductive and sexual health
    'pregnancy', 'fertility', 'contraception', 'menstruation',
    'menopause', 'erectile', 'std', 'sti', 'hpv', 'reproductive',
    'sexual health', 'birth control', 'family planning',
    
    // Pediatric specific
    'pediatric', 'newborn', 'infant', 'child', 'vaccination',
    'developmental', 'growth', 'milestone', 'teething', 'colic',
    'childhood disease', 'congenital', 'birth defect'
  ];
  
  const isMedicalQuery = medicalKeywords.some(keyword => userData.message.toLowerCase().includes(keyword.toLowerCase()));
  
  let responseText = '';
  
  try {
    messageElement.innerHTML = "<span class='typing-indicator'>Thinking<span>.</span><span>.</span><span>.</span></span>";
    
    if (isMedicalQuery) {
      // For medical queries, perform a web search first
      const searchQuery = `medical ${userData.message} treatment medicine`;
      const searchResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json`);
      const searchData = await searchResponse.json();
      
      // Extract relevant information from search results
      const searchResults = searchData.RelatedTopics ? searchData.RelatedTopics.slice(0, 3) : [];
      const searchInfo = searchResults.map(result => result.Text).join('\n\n');
      
      // Format web search results with proper markdown
      responseText = `## 🔍Search Results

${searchInfo}

<div class="disclaimer">⚠️ **Medical Disclaimer:** This information is for general guidance only and not a substitute for professional medical advice. Always consult a healthcare provider for specific medical concerns.</div>`;
    }
    
    // Add the message to chat history with improved formatting request
    let promptInstructions = `Please format your response using these guidelines:
1. Use primarily natural paragraphs for most explanations
2. Only use bullet points when listing distinct items or steps
3. Avoid excessive subdivision of content into bullet points
4. Use at most 2 levels of bullet point nesting
5. Use bold text for emphasis within paragraphs
6. Use headings (##) only for major section divisions
7. Prefer complete sentences and flowing paragraphs over fragmented points`;

    if (isCodeRequest) {
      promptInstructions += `\nFor code examples:
• Write a brief introduction paragraph explaining the solution
• Show the code in a single markdown code block with proper language tag
• After the code, explain key parts in paragraph form, not bullet points
• If needed, include a short example of usage in a separate code block`;
    } else if (isMedicalQuery) {
      promptInstructions += `\nFor medical information:
• Begin with a concise paragraph overview of the condition/topic
• Present main explanations in paragraph form
• Only use bullet points for listing symptoms, medications, or specific steps
• For important medical terms or warnings, use [RED]important text here[/RED]
• Format critical warnings in bold: **Warning:** followed by the warning text
• End with a conclusive paragraph, not bullet points`;
    }
    
    chatHistory.push({
      role: "user",
      parts: [{ text: `${userData.message}\n\n${promptInstructions}` }],
    });
    
// Get AI response
const requestOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contents: chatHistory,
  }),
};
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error.message);
    
    const aiResponse = data.candidates[0].content.parts[0].text.trim();
    
    // Format the final response
    if (isMedicalQuery) {
      responseText = `${responseText}\n\n\n\n${aiResponse}`;
    } else if (isCodeRequest) {
      responseText = `## 💻 Code Solution\n\n${aiResponse}\n\n**Note:** Click the copy button in the code block to copy the code.`;
    } else {
      responseText = `## 💬 Response\n\n${aiResponse}`;
    }
    
    await typeResponse(messageElement, responseText);
    
    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }],
    });
    
  } catch (error) {
    console.error(error);
    messageElement.innerText = "Sorry, something went wrong. Please try again.";
    messageElement.style.color = "#ff5252";
  } finally {
    sendMessage.disabled = false;
    stopResponse.style.display = 'none';
    isGeneratingResponse = false;
    stopTyping = false;
    scrollToBottom();
  }
};

// Scroll to bottom of chat
const scrollToBottom = () => {
  const chatContent = document.querySelector('.chat-content');
  
  // Calculate if user is near bottom (within 100px)
  const isNearBottom = chatContent.scrollHeight - chatContent.scrollTop - chatContent.clientHeight < 100;
  
  // Only auto-scroll if user is near bottom or this is a new message
  if (isNearBottom || isGeneratingResponse) {
    chatContent.scrollTo({
      top: chatContent.scrollHeight,
      behavior: 'smooth'
    });
  }
};

// Typing effect for bot responses with structured output
const typeResponse = async (element, text, isWelcomeMessage = false) => {
  element.innerHTML = "";
  
  // Normalize newlines and split into lines
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let processedText = "";
  let inList = false;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let lastScrollTime = 0;
  let currentBulletPoint = '';
  let currentIndentLevel = 0;
  let paragraphBuffer = '';
  
  // Speed settings - welcome message is much faster
  const typingDelayBase = isWelcomeMessage ? 1 : 10;
  const scrollInterval = isWelcomeMessage ? 50 : 250;
  
  const getIndentLevel = (line) => {
    const spaces = line.match(/^(\s*)/)[0].length;
    return Math.floor(spaces / 2); // 2 spaces = 1 indent level
  };
  
  const addBulletPoint = () => {
    if (currentBulletPoint) {
      const formattedListItem = formatText(currentBulletPoint);
      const indentClass = currentIndentLevel > 0 ? ` class="indent-${currentIndentLevel}"` : '';
      processedText += `<li${indentClass}>${formattedListItem}</li>`;
      currentBulletPoint = '';
    }
  };
  
  const addParagraph = () => {
    if (paragraphBuffer.trim()) {
      const indentLevel = getIndentLevel(paragraphBuffer);
      const indentClass = indentLevel > 0 ? ` class="indent-${indentLevel}"` : '';
      const formattedText = formatText(paragraphBuffer.trim());
      processedText += `<p${indentClass}>${formattedText}</p>`;
      paragraphBuffer = '';
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const indentLevel = getIndentLevel(originalLine);
    let line = originalLine.trim();
    
    // Handle code block start/end
    if (line.startsWith('```')) {
      // Add any pending content
      addBulletPoint();
      addParagraph();
      
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = '';
        continue;
      } else {
        inCodeBlock = false;
        processedText += createCodeBlock(codeBlockContent.trim(), codeBlockLanguage);
        scrollToBottom();
        continue;
      }
    }
    
    // Collect code block content
    if (inCodeBlock) {
      codeBlockContent += originalLine + '\n'; // Keep original indentation in code blocks
      continue;
    }
    
    // Handle markdown formatting
    if (line.startsWith('# ')) {
      // Add any pending content
      addBulletPoint();
      addParagraph();
      
      if (inList) {
        processedText += '</ul>';
        inList = false;
      }
      processedText += `<h1>${formatText(line.slice(2))}</h1>`;
      scrollToBottom();
    } else if (line.startsWith('## ')) {
      // Add any pending content
      addBulletPoint();
      addParagraph();
      
      if (inList) {
        processedText += '</ul>';
        inList = false;
      }
      processedText += `<h2>${formatText(line.slice(3))}</h2>`;
      scrollToBottom();
    } else if (line.startsWith('### ')) {
      // Add any pending content
      addBulletPoint();
      addParagraph();
      
      if (inList) {
        processedText += '</ul>';
        inList = false;
      }
      processedText += `<h3>${formatText(line.slice(4))}</h3>`;
      scrollToBottom();
    } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      // Add any pending paragraph
      addParagraph();
      
      // Add previous bullet point if exists
      addBulletPoint();
      
      // Start new list if needed
      if (!inList) {
        processedText += '<ul>';
        inList = true;
      }
      
      // Start new bullet point
      currentBulletPoint = line.slice(2);
      currentIndentLevel = indentLevel;
    } else if (line === '') {
      // Empty line - finalize any pending content
      addBulletPoint();
      addParagraph();
      
      // Only close list if we have an empty line
      if (inList) {
        processedText += '</ul>';
        inList = false;
      }
    } else {
      // If we're in a list and have a current bullet point, append this line to it
      if (inList && currentBulletPoint) {
        // If this line is more indented than the bullet point, add it as indented content
        if (indentLevel > currentIndentLevel) {
          currentBulletPoint += ` <span class="indent-${indentLevel - currentIndentLevel}">${line}</span>`;
        } else {
          currentBulletPoint += ' ' + line;
        }
      } else {
        // Add any remaining bullet point
        addBulletPoint();
        
        // If there's already content in the paragraph buffer
        if (paragraphBuffer) {
          // If this is an indented line, treat as part of same paragraph
          paragraphBuffer += ' ' + line;
        } else {
          // Start a new paragraph
          paragraphBuffer = originalLine;
        }
      }
    }
    
    // Update the element's content
    element.innerHTML = processedText;
    
    // Scroll periodically
    const currentTime = Date.now();
    if (currentTime - lastScrollTime > scrollInterval) {
      scrollToBottom();
      lastScrollTime = currentTime;
    }
  }
  
  // Add any remaining content
  addBulletPoint();
  addParagraph();
  
  // Close any open list
  if (inList) {
    processedText += '</ul>';
    element.innerHTML = processedText;
  }
  
  // Add typing effect
  const parts = processedText.split(/(<[^>]*>)/g);
  let currentIndex = 0;
  
  // Calculate typing speed based on whether this is welcome message
  // Welcome message is typed much faster with fewer pauses
  const typingBlockSize = isWelcomeMessage ? 6 : 1; // Type 6 chars at once for welcome msg 
  
  for (const part of parts) {
    if (stopTyping) break;
    
    if (part.startsWith('<') && part.endsWith('>')) {
      element.innerHTML = processedText.substring(0, currentIndex) + part;
      currentIndex += part.length;
      continue;
    }
    
    // For welcome message, add larger chunks of text at once
    if (isWelcomeMessage) {
      for (let i = 0; i < part.length; i += typingBlockSize) {
        if (stopTyping) break;
        
        const chunkSize = Math.min(typingBlockSize, part.length - i);
        currentIndex += chunkSize;
        element.innerHTML = processedText.substring(0, currentIndex);
        
        // Very small delay for welcome message typing
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } else {
      // Normal typing for other messages
      for (let i = 0; i < part.length; i++) {
        if (stopTyping) break;
        
        currentIndex++;
        element.innerHTML = processedText.substring(0, currentIndex);
        
        // Adjust typing speed based on content length
        const delay = part.length > 500 ? 1 : (part.length > 200 ? 3 : typingDelayBase);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (stopTyping) {
    element.innerHTML += "... (stopped)";
  }
  
  // Final scroll
  scrollToBottom();
  return true;
};

// Helper function to format text with formatting
function formatText(text) {
  // Extract only code blocks to protect them from formatting
  const codeBlocks = [];
  const inlineCode = [];
  
  // Store code blocks to protect them from formatting
  text = text.replace(/```([\s\S]*?)```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Store inline code
  text = text.replace(/`([^`]+)`/g, (match) => {
    inlineCode.push(match);
    return `__INLINE_CODE_${inlineCode.length - 1}__`;
  });
  
  // Process markdown inside disclaimer and warning blocks first
  text = text.replace(/<div class="(disclaimer|warning)">([\s\S]*?)<\/div>/g, (match, className, content) => {
    // Apply formatting to content inside disclaimer/warning
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[RED\](.*?)\[\/RED\]/g, '<span class="important-medical">$1</span>');
    
    return `<div class="${className}">${formattedContent}</div>`;
  });
  
  // Handle basic formatting for the rest of the text
  text = text
    // Handle bold text with double asterisks
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Handle italic text with single asterisks
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Handle inline code (for any that weren't caught earlier)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Convert asterisk bullet points to bullet character
    .replace(/^\* /gm, '• ')
    // Convert hyphen bullet points to bullet character
    .replace(/^- /gm, '• ')
    // Add important-medical class to medical terms in red
    .replace(/\[RED\](.*?)\[\/RED\]/g, '<span class="important-medical">$1</span>');
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    text = text.replace(`__CODE_BLOCK_${i}__`, block);
  });
  
  // Restore inline code
  inlineCode.forEach((code, i) => {
    text = text.replace(`__INLINE_CODE_${i}__`, code);
  });
  
  return text;
}

// Handle outgoing messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  
  userData.message = messageInput.value.trim();
  if (!userData.message) return;
  
  messageInput.value = "";
  messageInput.style.height = `${initialInputHeight}px`;
  
  const outgoingMessageDiv = createMessageElement(userData.message, "user-message");
  chatContent.appendChild(outgoingMessageDiv);
  
  // Ensure user message is visible
  scrollToBottom();
  
  const suggestedPrompts = document.querySelector(".suggested-prompts");
  if (suggestedPrompts) {
    suggestedPrompts.remove();
  }
  
  setTimeout(() => {
    const incomingMessageDiv = createMessageElement("", "bot-message");
    chatContent.appendChild(incomingMessageDiv);
    generateBotResponse(incomingMessageDiv);
    // Ensure the typing indicator is visible
    scrollToBottom();
  }, 300);
};

// Clear chat history
const clearChatHistory = () => {
  chatContent.innerHTML = "";
  chatHistory.length = 0;
  
  // Recreate welcome message
  const welcomeMessageDiv = createMessageElement("", "bot-message");
  chatContent.appendChild(welcomeMessageDiv);
  typeResponse(welcomeMessageDiv.querySelector(".message-text"), welcomeMessageText, true);
  
  // Recreate suggested prompts
  const suggestedPromptsDiv = document.createElement("div");
  suggestedPromptsDiv.classList.add("suggested-prompts");
  suggestedPromptsDiv.innerHTML = `
    <button class="prompt-button">What are symptoms of common cold?</button>
    <button class="prompt-button">How to treat fever at home?</button>
    <button class="prompt-button">First aid for minor burns</button>
  `;
  chatContent.appendChild(suggestedPromptsDiv);
  
  suggestedPromptsDiv.querySelectorAll(".prompt-button").forEach(button => {
    button.addEventListener("click", () => {
      userData.message = button.textContent;
      messageInput.value = userData.message;
      handleOutgoingMessage(new Event("submit"));
    });
  });
};

// Stop response generation
const stopResponseGeneration = () => {
  if (isGeneratingResponse) {
    stopTyping = true;
    stopResponse.style.display = 'none';
    sendMessage.disabled = false;
    isGeneratingResponse = false;
  }
};

// Dark mode toggle
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  darkModeToggle.textContent = document.body.classList.contains("light-mode") ? "light_mode" : "dark_mode";
  
  localStorage.setItem('theme', document.body.classList.contains("light-mode") ? 'light' : 'dark');
});

// Setup event listeners
const setupEventListeners = () => {
  messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    const newHeight = Math.min(messageInput.scrollHeight, 150);
    messageInput.style.height = `${newHeight}px`;
    
    sendMessage.disabled = messageInput.value.trim() === '';
  });
  
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (messageInput.value.trim()) {
        e.preventDefault();
        handleOutgoingMessage(new Event("submit"));
      }
    }
  });
  
  chatForm.addEventListener("submit", (e) => handleOutgoingMessage(e));
  
  voiceInput.addEventListener("click", toggleVoiceInput);
  
  stopResponse.addEventListener("click", stopResponseGeneration);
  
  clearChat.addEventListener("click", clearChatHistory);
  
  promptButtons.forEach(button => {
    button.addEventListener("click", () => {
      userData.message = button.textContent;
      messageInput.value = userData.message;
      handleOutgoingMessage(new Event("submit"));
    });
  });
  
  sendMessage.disabled = true;
};

// Initialize the application
const initApp = () => {
  setupSpeechRecognition();
  setupEventListeners();
  
  // Render welcome message with markdown but faster
  const welcomeMessageDiv = document.querySelector("#welcome-message .message-text");
  typeResponse(welcomeMessageDiv, welcomeMessageText, true);
  
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add("light-mode");
    darkModeToggle.textContent = 'light_mode';
  }
};

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);