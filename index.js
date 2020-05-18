require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')

const app = express()
const port = process.env.PORT || 4000

// for scraping functionality
var puppeteer = require("puppeteer")

//boiler plate code
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Welcome to The Searcher Chatbot for Zoom!')
})

app.get('/authorize', (req, res) => {
  res.redirect('https://zoom.us/launch/chat?jid=robot_' + process.env.zoom_bot_jid)
})

app.get('/support', (req, res) => {
  res.send('Contact notd5a@gmail.com for support, or post an issue on the github page https://github.com/notd5a .')
})

app.get('/privacy', (req, res) => {
  res.send('The Searcher Chatbot for Zoom does not store any user data.')
})

app.get('/terms', (req, res) => {
  res.send('By installing The Searcher Chatbot for Zoom, you are accept and agree to these terms...')
})

app.get('/documentation', (req, res) => {
  res.send('Use the google command followed by your qeuery :)')
})

app.get('/zoomverify/verifyzoom.html', (req, res) => {
  res.send(process.env.zoom_verification_code)
})


//search function here
app.post('/google', (req, res) => {
    //This section is where i will be integrating the whole search mechanism from the npm package google
        getChatbotToken();

        const preparePageForTests = async (page) => {

            // Pass the User-Agent Test.
            const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +
              'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
            await page.setUserAgent(userAgent);
        }

        let scrape = async () => { 

        //scraping here
        const browser = await puppeteer.launch({ headless : false });
        const page = await browser.newPage();
        await preparePageForTests(page)
        await page.goto('https://google.com/');
        await page.waitFor(1000);
        await page.waitForSelector('#tsf > div:nth-child(2) > div.A8SBwf > div.RNNXgb > div > div.a4bIc > input');
        await page.waitForSelector('#tsf > div:nth-child(2) > div.A8SBwf > div.FPdoLc.tfB0Bf > center > input.gNO89b');
        await page.$eval('#tsf > div:nth-child(2) > div.A8SBwf > div.RNNXgb > div > div.a4bIc > input', el => el.value = `${req.body.payload.cmd}`);
        await page.click('#tsf > div:nth-child(2) > div.A8SBwf > div.FPdoLc.tfB0Bf > center > input.gNO89b');
        await page.waitFor(2000);
        
        const result = await page.evaluate(() => {
            var title = document.querySelector('#rso > div:nth-child(1) > div > div > div.r > a > h3').textContent;
            var href = document.querySelector('#rso > div:nth-child(1) > div > div > div.r > a > div > cite').textContent;
            var description = document.querySelector('#rso > div:nth-child(1) > div > div > div.s > div > span').textContent;
            
            return {
                title,
                href,
                description
            }

        }).catch(error => {
            console.log('Promise rejected: ' + error);
        })
            //return value here
            browser.close();
            return result;
        }

        function getChatbotToken () {
        request({
        url: `https://api.zoom.us/oauth/token?grant_type=client_credentials`,
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(process.env.zoom_client_id + ':' + process.env.zoom_client_secret).toString('base64')
        }
        }, (error, httpResponse, body) => {
        if (error) {
            console.log('Error getting chatbot_token from Zoom.', error)
        } else {
            body = JSON.parse(body);
            scrape().then((value) => {
            search(body.access_token, value);
            console.log(value);
        }).catch( error =>  {
            console.log(error);
        });
        }
        })
        }
            

        function search(chatBotToken, value) {
            request({
                    url: 'https://api.zoom.us/v2/im/chat/messages',
                    method: 'POST',
                    json: true,
                    body: {
                        "robot_jid": process.env.zoom_bot_jid,
                        "to_jid": req.body.payload.toJid,
                        "account_id": req.body.payload.accountId,
                        "content": {
                            "head": {
                            "text": value.title,
                            "style": {
                                "color": "#6C63FF",
                                "bold": true,
                                "italic": false
                            },
                            "sub_head": {
                                "text": value.description,
                                "style": {
                                    "color": "#3F3D56",
                                    "bold": false,
                                    "italic": true
                                }
                            }
                            },
                            "body": [{
                                "type": "section",
                                "sidebar_color": "#3F3D56",
                                "sections": [
                                {
                                    "type": "message",
                                    "text": `https://${value.href}/`,
                                    "link": `https://${value.href}/`
                                }
                                ]
                            }]
                        }
                        },
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + chatBotToken
                    }
                    }, (error, httpResponse, body) => {
                    if (error) {
                        console.log('Error sending chat.', error)
                    } else {
                        console.log(body)
                    }
                    })
    }        
})

app.post('/deauthorize', (req, res) => {
  if (req.headers.authorization === process.env.zoom_verification_token) {
    res.status(200)
    res.send()
    request({
      url: 'https://api.zoom.us/oauth/data/compliance',
      method: 'POST',
      json: true,
      body: {
        'client_id': req.body.payload.client_id,
        'user_id': req.body.payload.user_id,
        'account_id': req.body.payload.account_id,
        'deauthorization_event_received': req.body.payload,
        'compliance_completed': true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(process.env.zoom_client_id + ':' + process.env.zoom_client_secret).toString('base64'),
        'cache-control': 'no-cache'
      }
    }, (error, httpResponse, body) => {
      if (error) {
        console.log(error)
      } else {
        console.log(body)
      }
    })
  } else {
    res.status(401)
    res.send('Unauthorized request to the Music Player chatbot for Zoom.')
  }
})

app.listen(port, () => console.log(`The Searcher Chatbot for Zoom listening on port ${port}!`))