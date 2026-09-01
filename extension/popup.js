import { prepareJobPage } from './prepare-job-page.js'
import { autofillFields } from './autofill-fields.js'

const APP_ORIGIN = 'http://localhost:3000'
const LAST_RESUME_KEY = 'lastResumeId'

const resumeSelect = document.getElementById('resume-select')
const grabBtn = document.getElementById('grab-btn')
const selectionBtn = document.getElementById('selection-btn')
const jdText = document.getElementById('jd-text')
const tailoringInstructions = document.getElementById('tailoring-instructions')
const generateBtn = document.getElementById('generate-btn')
const status = document.getElementById('status')
const autofillBtn = document.getElementById('autofill-btn')
const autofillStatus = document.getElementById('autofill-status')
let defaultProvider = null

function setStatus(message, isError = false) {
  status.textContent = message
  status.className = isError ? 'error' : ''
}

function setAutofillStatus(message, isError = false) {
  autofillStatus.textContent = message
  autofillStatus.className = isError ? 'error' : ''
}

function updateGenerateButton() {
  generateBtn.disabled = !resumeSelect.value || jdText.value.trim().length === 0 || !defaultProvider
}

function updateAutofillButton() {
  autofillBtn.disabled = !resumeSelect.value
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// This-page detection expands relevant closed job-content sections first, then
// captures the result for the user to quickly confirm before generation.
async function detectJobPage(showStatus) {
  try {
    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: prepareJobPage })
    if (result) {
      jdText.value = result
      jdText.placeholder = ''
      if (showStatus) setStatus('Looks like a job posting — check the captured text, then continue.')
    } else {
      jdText.placeholder = 'Click "Grab job description" above'
      if (showStatus) {
        setStatus('Doesn\'t look like a job posting from here — try Grab, or highlight the description on the page and use "Use selected text".')
      }
      selectionBtn.style.display = 'block'
      selectionBtn.disabled = false
    }
  } catch {
    jdText.placeholder = 'Click "Grab job description" above'
    if (showStatus) {
      setStatus('Can\'t read this page — try highlighting the job description and using "Use selected text".', true)
    }
    selectionBtn.style.display = 'block'
    selectionBtn.disabled = false
  }
  updateGenerateButton()
}

// Returns true once the app is reachable and has resumes to work with —
// i.e. once detectJobPage's status message is safe to show without
// burying a more foundational problem (dev server down, no resumes yet).
async function loadResumes() {
  try {
    const res = await fetch(`${APP_ORIGIN}/api/resumes`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const resumes = await res.json()
    const providerResponse = await fetch(`${APP_ORIGIN}/api/providers`)
    if (!providerResponse.ok) throw new Error(`provider status ${providerResponse.status}`)
    const providers = await providerResponse.json()
    defaultProvider = typeof providers.default === 'string' ? providers.default : null

    if (!Array.isArray(resumes) || resumes.length === 0) {
      setStatus('No resumes yet — import one in Dynamic Resume first.', true)
      return false
    }
    if (!defaultProvider) {
      setStatus('No AI provider is configured — add an OpenAI or Gemini key in Dynamic Resume first.', true)
      return false
    }

    const { [LAST_RESUME_KEY]: lastId } = await chrome.storage.local.get(LAST_RESUME_KEY)
    resumeSelect.innerHTML = ''
    for (const r of resumes) {
      const option = document.createElement('option')
      option.value = r.id
      option.textContent = r.label
      resumeSelect.appendChild(option)
    }
    if (lastId && resumes.some(r => r.id === lastId)) resumeSelect.value = lastId

    resumeSelect.disabled = false
    grabBtn.disabled = false
    updateGenerateButton()
    updateAutofillButton()
    return true
  } catch {
    setStatus(`Can't reach Dynamic Resume — is "npm run dev" running?`, true)
    return false
  }
}

grabBtn.addEventListener('click', async () => {
  setStatus('Reading the page…')
  try {
    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: prepareJobPage })
    if (result) {
      jdText.value = result
      selectionBtn.style.display = 'none'
      setStatus('Captured — check it looks right before continuing.')
    } else {
      selectionBtn.style.display = 'block'
      selectionBtn.disabled = false
      setStatus("Couldn't auto-detect the job description. Highlight it on the page, then press \"Use selected text\".", true)
    }
  } catch {
    setStatus("Couldn't read that page — try highlighting the job description and using \"Use selected text\" instead.", true)
    selectionBtn.style.display = 'block'
    selectionBtn.disabled = false
  }
  updateGenerateButton()
})

selectionBtn.addEventListener('click', async () => {
  try {
    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    })
    const trimmed = (result || '').trim()
    if (trimmed) {
      jdText.value = trimmed
      setStatus('Using your selected text.')
    } else {
      setStatus('Nothing was selected on the page — highlight the job description first.', true)
    }
  } catch {
    setStatus("Couldn't read the selection on that page.", true)
  }
  updateGenerateButton()
})

generateBtn.addEventListener('click', async () => {
  const resumeId = resumeSelect.value
  const text = jdText.value.trim()
  if (!resumeId || !text || !defaultProvider) return

  await chrome.storage.local.set({ [LAST_RESUME_KEY]: resumeId })
  generateBtn.disabled = true
  setStatus('Creating a tailored resume for this job…')
  try {
    const tab = await getActiveTab()
    const response = await fetch(`${APP_ORIGIN}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseResumeId: resumeId,
        jdText: text,
        tailoringInstructions: tailoringInstructions.value.trim() || undefined,
        provider: defaultProvider,
        job: { url: tab.url || '', title: tab.title || 'Job application' },
      }),
    })
    const application = await response.json()
    if (!response.ok) throw new Error(application.error || 'Could not create application')
    await chrome.tabs.create({ url: `${APP_ORIGIN}/applications/${application.id}` })
    setStatus('Generating your tailored resume in Dynamic Resume…')
  } catch (error) {
    setStatus((error instanceof Error ? error.message : 'Could not create tailored resume'), true)
  } finally {
    updateGenerateButton()
  }
})

autofillBtn.addEventListener('click', async () => {
  const resumeId = resumeSelect.value
  if (!resumeId) return

  setAutofillStatus('Filling in what we can find…')
  try {
    const res = await fetch(`${APP_ORIGIN}/api/resumes/${resumeId}`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const resume = await res.json()

    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autofillFields,
      args: [resume.basics],
    })

    const filled = Object.entries(result).filter(([, ok]) => ok).map(([field]) => field)
    const missed = Object.entries(result).filter(([, ok]) => !ok).map(([field]) => field)
    if (filled.length === 0) {
      setAutofillStatus("Couldn't find any matching fields on this page — fill it in yourself.", true)
    } else if (missed.length === 0) {
      setAutofillStatus(`Filled: ${filled.join(', ')}.`)
    } else {
      setAutofillStatus(`Filled: ${filled.join(', ')}. Couldn't find: ${missed.join(', ')}.`)
    }
  } catch {
    setAutofillStatus("Couldn't fill fields on this page — check the app is running and try again.", true)
  }
})

jdText.addEventListener('input', updateGenerateButton)
resumeSelect.addEventListener('change', () => { updateGenerateButton(); updateAutofillButton() })

async function init() {
  const ready = await loadResumes()
  await detectJobPage(ready)
}
init()
