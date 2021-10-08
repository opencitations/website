# website
The code and content of the official website of OpenCitations

# Install web.py (Python 3)

`pip3 install git+https://github.com/webpy/webpy#egg=web.py --user`

# Install redis
In order to install Redis issue the commands below:
`
sudo apt update -y
sudo apt upgrade -y
sudo apt install redis-server
`

After installation redis will start automatically, you can check the status using the command below:
`sudo systemctl status redis-server`

# Requirements
* web.py
* rdflib
* rdflib-jsonld
* sparqlwrapper
* python-dateutil
* redis-py
* prometheus_client
