import { extractJd } from './extract-jd.js'
import { autofillFields } from './autofill-fields.js'

const APP_ORIGIN = 'http://localhost:3000'
const LAST_RESUME_KEY = 'lastResumeId'

const resumeSelect = document.getElementById('resume-select')
const grabBtn = document.getElementById('grab-btn')
const selectionBtn = document.getElementById('selection-btn')
const jdText = document.getElementById('jd-text')
const openBtn = document.getElementById('open-btn')
const status = document.getElementById('status')
const autofillBtn = document.getElementById('autofill-btn')
const autofillStatus = document.getElementById('autofill-status')

function setStatus(message, isError = false) {
  status.textContent = message
  status.className = isError ? 'error' : ''
}

function setAutofillStatus(message, isError = false) {
  autofillStatus.textContent = message
  autofillStatus.className = isError ? 'error' : ''
}

function updateOpenButton() {
  openBtn.disabled = !resumeSelect.value || jdText.value.trim().length === 0
}

function updateAutofillButton() {
  autofillBtn.disabled = !resumeSelect.value
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// Runs inside the target page, not popup.js — must be fully self-contained
// (only its own parameter and the page's own globals), since
// chrome.scripting re-executes just this function's source there.
function setTextareaValue(text) {
  const el = document.getElementById('jd-text')
  if (!el) return false
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  nativeSetter.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

// This-page detection: a page "is a job posting" exactly when extractJd can
// find job-description-shaped content on it — reusing that function as the
// detection signal avoids maintaining a second, possibly-disagreeing
// heuristic. Runs once automatically when the popup opens, after
// loadResumes — see the `showStatus` param for why.
async function detectJobPage(showStatus) {
  try {
    const tab = await getActiveTab()
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJd })
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
  updateOpenButton()
}

// Returns true once the app is reachable and has resumes to work with —
// i.e. once detectJobPage's status message is safe to show without
// burying a more foundational problem (dev server down, no resumes yet).
async function loadResumes() {
  try {
    const res = await fetch(`${APP_ORIGIN}/api/resumes`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const resumes = await res.json()

    if (!Array.isArray(resumes) || resumes.length === 0) {
      setStatus('No resumes yet — import one in Dynamic Resume first.', true)
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
    updateOpenButton()
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
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJd })
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
  updateOpenButton()
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
  updateOpenButton()
})

openBtn.addEventListener('click', async () => {
  const resumeId = resumeSelect.value
  const text = jdText.value.trim()
  if (!resumeId || !text) return

  await chrome.storage.local.set({ [LAST_RESUME_KEY]: resumeId })
  setStatus('Opening Dynamic Resume…')

  const newTab = await chrome.tabs.create({ url: `${APP_ORIGIN}/tailor/${resumeId}` })

  let injected = false
  const inject = async () => {
    if (injected) return
    injected = true
    try {
      await chrome.scripting.executeScript({ target: { tabId: newTab.id }, func: setTextareaValue, args: [text] })
      setStatus('Done — the job description is filled in over there.')
    } catch {
      setStatus('Opened the tab, but the paste-in step failed — paste the JD there manually.', true)
    }
  }

  const timeout = setTimeout(inject, 4000)
  function onUpdated(tabId, changeInfo) {
    if (tabId === newTab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      clearTimeout(timeout)
      inject()
    }
  }
  chrome.tabs.onUpdated.addListener(onUpdated)
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

jdText.addEventListener('input', updateOpenButton)
resumeSelect.addEventListener('change', () => { updateOpenButton(); updateAutofillButton() })

async function init() {
  const ready = await loadResumes()
  await detectJobPage(ready)
}
init()
