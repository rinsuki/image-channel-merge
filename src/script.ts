/// <reference lib="dom" />

const rowHeader = document.getElementById("header")! as HTMLTableRowElement
const rowHeader2 = document.getElementById("header2")! as HTMLTableRowElement
const rowR = document.getElementById("r")! as HTMLTableRowElement
const rowG = document.getElementById("g")! as HTMLTableRowElement
const rowB = document.getElementById("b")! as HTMLTableRowElement
const rowA = document.getElementById("a")! as HTMLTableRowElement

const rowColors = []
var i = 0

function wrappedByTD(elm: Element, colSpan = 1) {
    const td = document.createElement("td")
    td.appendChild(elm)
    td.colSpan = colSpan
    return td
}

function wrappedByLabel(elm: Element) {
    const label = document.createElement("label")
    label.appendChild(elm)
    return label
}

class FileInput {
    fileElm = document.createElement("input")

    constructor() {
        i++
        this.fileElm.type = "file"
        this.fileElm.id = `file_${i}`
        this.fileElm.required = true
        rowHeader.appendChild(wrappedByTD(this.fileElm, 4))

        for (const channel of ["r", "g", "b", "a"]) {
            const th = document.createElement("th")
            th.innerText = channel.toUpperCase()
            rowHeader2.appendChild(th)
            for (const dest of [rowR, rowG, rowB, rowA]) {
                const radio = document.createElement("input")
                radio.type = "radio"
                radio.name = dest.id
                radio.value = `${i}_${channel}`
                radio.required = true
                dest.appendChild(wrappedByTD(wrappedByLabel(radio)))
            }
        }
    }

    file() {
        const file = this.fileElm.files!.item(0)
        if (file == null) throw `load failed`
        return file
    }
}

const fi1 = new FileInput()
const fi2 = new FileInput()

async function run(fd: FormData) {
    const files = [fi1, fi2].map((f) => f.file())
    const images = await Promise.all(
        files.map((f) => {
            const img = new Image()
            img.src = URL.createObjectURL(f)
            return new Promise<HTMLImageElement>((resolve, reject) => {
                img.onload = () => resolve(img)
                img.onerror = reject
            })
        })
    )
    images.reduce((prev, current) => {
        if (prev < 0 || prev === current.width) return current.width
        throw `not same width`
    }, -1)
    images.reduce((prev, current) => {
        if (prev < 0 || prev === current.height) return current.height
        throw `not same height`
    }, -1)
    const canvas = document.getElementById("canvas") as HTMLCanvasElement
    canvas.width = images[0].width
    canvas.height = images[0].height
    const ctx = canvas.getContext("2d")
    if (ctx == null) throw "failed to get 2d context"
    const imgData = images.map((img) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
    })
    const result = ctx.createImageData(canvas.width, canvas.height)
    const channels = ["r", "g", "b", "a"]
    for (const [i, channel] of channels.entries()) {
        const [fromIndexStr, fromChannelStr] = (fd.get(
            channel
        ) as string).split("_")
        const fromArr = imgData[parseInt(fromIndexStr, 10) - 1].data
        const fromChannel = channels.indexOf(fromChannelStr)
        for (let p = 0; p < result.data.length; p += 4) {
            result.data[p + i] = fromArr[p + fromChannel]
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.putImageData(result, 0, 0)
}

document.getElementById("form")!.addEventListener("submit", (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    run(fd).catch((e) => {
        console.error(e)
        alert(e)
    })
})
