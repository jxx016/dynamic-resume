import { prepareJobPage, extractJobMeta } from './prepare-job-page.js'
import { autofillFields } from './autofill-fields.js'

const APP_ORIGIN = 'http://localhost:3000'
const resumeSelect = null
const profileSummary = document.getElementById('profile-summary')
const grabBtn = document.getElementById('grab-btn')
const recaptureBtn = document.getElementById('recapture-btn')
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
  generateBtn.disabled = jdText.value.trim().length === 0 || !defaultProvider
}

function updateAutofillButton() {
  autofillBtn.disabled = !defaultProvider
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// This-page detection expands relevant closed job-content sections first, then
// captures the result for the user to quickly confirm before generation.
function updateCaptureUi(mode) {
  const autoCaptured = mode === 'auto'
  grabBtn.style.display = autoCaptured ? 'none' : 'block'
  grabBtn.textContent = autoCaptured ? 'Re-grab from page' : 'Grab job description'
  recaptureBtn.style.display = autoCaptured ? 'block' : 'none'
  recaptureBtn.disabled = false
}

function defaultTailoringForJob(title) {
  if (!title) return ''
  if (/solutions?\s+engineer|sales\s+engineer|forward\s+deployed/i.test(title)) {
    return 'Curate this as a Solutions Engineer resume: emphasize customer-facing technical wins, POCs, demos, workshops, production agent deployments, and LangChain/LangGraph experience. Only truthful edits.'
  }
  return ''
}

async function detectJobPage(showStatus) {
  try {
    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: prepareJobPage })
    const [{ result: meta }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJobMeta })
    if (result) {
      jdText.value = result
      jdText.placeholder = ''
      if (!tailoringInstructions.value.trim()) {
        tailoringInstructions.value = defaultTailoringForJob(meta?.title || tab.title || '')
      }
      updateCaptureUi('auto')
      if (showStatus) setStatus('Captured from this page — check the text, then generate.')
    } else {
      jdText.placeholder = 'Use the buttons below to capture the job description'
      updateCaptureUi('manual')
      if (showStatus) {
        setStatus('Could not auto-detect a job description here — grab it manually below.')
      }
      selectionBtn.style.display = 'block'
      selectionBtn.disabled = false
    }
  } catch {
    jdText.placeholder = 'Use the buttons below to capture the job description'
    updateCaptureUi('manual')
    if (showStatus) {
      setStatus('Could not read this page — grab the description manually below.', true)
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
    const res = await fetch(`${APP_ORIGIN}/api/profile`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const profile = await res.json()
    const providerResponse = await fetch(`${APP_ORIGIN}/api/providers`)
    if (!providerResponse.ok) throw new Error(`provider status ${providerResponse.status}`)
    const providers = await providerResponse.json()
    defaultProvider = typeof providers.default === 'string' ? providers.default : null

    if (!profile?.basics?.value?.name) {
      setStatus('No resumes yet — import one in Dynamic Resume first.', true)
      return false
    }
    if (!defaultProvider) {
      setStatus('No AI provider is configured — add an OpenAI or Gemini key in Dynamic Resume first.', true)
      return false
    }

    profileSummary.textContent = `Using verified profile: ${profile.basics.value.name}`
    grabBtn.disabled = false
    recaptureBtn.disabled = false
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
      updateCaptureUi('auto')
      setStatus('Captured — check it looks right before continuing.')
    } else {
      updateCaptureUi('manual')
      selectionBtn.style.display = 'block'
      selectionBtn.disabled = false
      setStatus("Couldn't auto-detect the job description. Highlight it on the page, then press \"Use selected text\".", true)
    }
  } catch {
    updateCaptureUi('manual')
    setStatus("Couldn't read that page — try highlighting the job description and using \"Use selected text\" instead.", true)
    selectionBtn.style.display = 'block'
    selectionBtn.disabled = false
  }
  updateGenerateButton()
})

recaptureBtn.addEventListener('click', () => grabBtn.click())

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
  const text = jdText.value.trim()
  if (!text || !defaultProvider) return
  generateBtn.disabled = true
  setStatus('Creating a tailored resume for this job…')
  try {
    const tab = await getActiveTab()
    const [{ result: meta }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJobMeta })
    const response = await fetch(`${APP_ORIGIN}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jdText: text,
        tailoringInstructions: tailoringInstructions.value.trim() || undefined,
        provider: defaultProvider,
        job: {
          url: tab.url || '',
          title: meta?.title || tab.title || 'Job application',
          company: meta?.company || undefined,
        },
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
  setAutofillStatus('Filling in what we can find…')
  try {
    const res = await fetch(`${APP_ORIGIN}/api/profile`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const profile = await res.json()

    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autofillFields,
      args: [profile.basics.value],
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

async function init() {
  const ready = await loadResumes()
  await detectJobPage(ready)
}
init()
