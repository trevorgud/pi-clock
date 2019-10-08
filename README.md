# pi-clock
Raspberry pi web based clock, built with React.

Install dependencies:
```
sudo apt-get install xdotool unclutter sed docker.io
```

Build the docker image (from project root):
```
sudo docker build . -f ./Dockerfile -t pi-clock
```

Create the docker container to auto start on boot:
```
docker run -d \
  -p 80:80 \
  --name=pi-clock \
  --restart=always \
  pi-clock
```

Move the file `kiosk/kiosk.sh` to `/home/pi/kiosk.sh`

Move the file `kiosk/kiosk.service` to `/lib/systemd/system/kiosk.service`

To enable the kiosk mode to start on boot:
```
sudo systemctl enable kiosk.service
```

Reboot to run the web app and open kiosk mode with a window for the clock/weather app.

For more detailed build and setup instructions:
https://pimylifeup.com/raspberry-pi-kiosk/
https://mherman.org/blog/dockerizing-a-react-app/
