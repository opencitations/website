#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2016, Silvio Peroni <essepuntato@gmail.com>
#
# Permission to use, copy, modify, and/or distribute this software for any purpose
# with or without fee is hereby granted, provided that the above copyright notice
# and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
# REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
# FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
# OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
# DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
# ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
# SOFTWARE.

__author__ = 'essepuntato'
import web
import json
from src.wl import WebLogger
from src.rrh import RewriteRuleHandler
from src.ldd import LinkedDataDirector
from src.ved import VirtualEntityDirector
from src.ramose import APIManager, Operation, HTMLDocumentationHandler
from src.oci import OCIManager
from src.intrepid import InTRePIDManager
import requests
import urllib.parse as urlparse
import urllib.request as urllib
import re
import csv
from datetime import datetime
from os import path
from os import listdir
from os import urandom
from io import StringIO
from hashlib import sha1
from urllib.parse import unquote, parse_qs

from redis import Redis
import uuid
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from prometheus_client import Counter, CollectorRegistry, generate_latest, Gauge, Info
from prometheus_client.parser import text_fd_to_metric_families

# Load the configuration file
with open("__test_oc_conf.json") as f:
    c = json.load(f)

with open(c["auth_file"]) as f:
    c_auth = json.load(f)
    c_smtp = c_auth["smtp"]
    c_captcha = c_auth["captcha"]

pages = [
    {"name": "", "label": "Home"},
    {"name": "about", "label": "About"},
    {"name": "membership", "label": "Help us"},
    {"name": "model", "label": "Data Model"},
    {"name": "datasets", "label": "Datasets"},
    {"name": "querying", "label": "Querying Data"},
    {"name": "tools", "label": "Tools"},
    {"name": "download", "label": "Download"},
    {"name": "publications", "label": "Publications"}
]

active = {
    "corpus": "datasets",
    "index": "datasets",
    "meta": "datasets",
    "coci": "datasets",
    "doci": "datasets",
    "poci": "datasets",
    "croci": "datasets",
    "ccc": "datasets",
    "oci": "tools",
    "intrepid": "tools",
    "api": "querying",
    "sparql": "querying",
    "search": "querying"
}

urls = (
    # Generic URLs
    "/", "Home",
    "/(meta)(/api/.+)", "Api",
    "/(wikidata)(/api/.+)", "Api",
    "/(index)(/api/.+)", "Api",
    "/index/([^/]+)(/api/.+)", "Api",
    "/index/sparql", "SparqlIndex",
    "/meta/sparql", "SparqlMeta",
    "/index/search", "SearchIndex",
    "/index/browser/(.+)", "BrowserIndex",
    "/index/coci", "Coci",
    "/index/doci", "Doci",
    "/index/poci", "Poci",
    "/index/croci", "Croci",
    "/index/coci/(.*)", "CociContentNegotiation",
    "/index/doci/(.*)", "DociContentNegotiation",
    "/index/croci/(ci/.*)?", "CrociContentNegotiation",
    "/meta", "Meta",

    # CCC related urls
    "/(ccc)(/api/.+)", "Api",
    "/ccc", "CCC",
    "/ccc/sparql", "SparqlCCC",
    "/ccc/search", "SearchCCC",
    "/ccc/browser/(.+)", "BrowserCCC",
    "/ccc/(../.+)", "CCCContentNegotiation",

    "/(about)", "About",
    "/(model)", "Model",
    "/(datasets)", "Datasets",
    "/corpus", "Corpus",
    "/corpus/(.+)", "CorpusContentNegotiation",
    "/corpus/", "CorpusContentNegotiation",
    "/virtual/(.+)", "Virtual",
    "/oci(/.+)?", "OCI",
    "/intrepid(/.+)?", "InTRePID",
    "/(download)", "Download",
    "/(policy)", "Policy",

    # OCC SPARQL-related urls
    "/sparql", "SparqlOC",
    "/search", "SearchOC",
    "/browser/(.+)", "BrowserOC",
    "()(/api/.+)", "Api",

    # Other generic URLs
    "/(tools)", "Tools",
    "/(membership)", "Membership",
    "/(querying)", "Querying",
    "/(publications)", "Publications",
    "/(licenses)", "Licenses",
    "(/paper/.+)", "RawGit",
    "/index", "Index",
    "/robots.txt", "Robots",

    # Statistics
    "/(statistics)", "StatisticsIndex",
    "/statistics/(.+)", "Statistics",

    # Token
    "/accesstoken", "AuthCode",
    "/accesstoken/(.+)", "AuthCodeConfirm",
)

render = web.template.render(c["html"])

#set auto reload of html template
web.config["TEMPLATES_AUTO_RELOAD"] = True

rewrite = RewriteRuleHandler(
    "Redirect",
    [
        ("^/corpus/context.json$",
         "https://raw.githubusercontent.com/opencitations/corpus/master/context.json",
         True),
        ("^/ontology/?$",
         "https://w3id.org/oc/ontology",
         True),
        ("^/ontology.html$",
         "https://w3id.org/oc/ontology.html",
         True),
        ("^/ontology.json",
         "https://w3id.org/oc/ontology.json",
         True),
        ("^/ontology.rdf",
         "https://w3id.org/oc/ontology.xml",
         True),
        ("^/ontology.ttl",
         "https://w3id.org/oc/ontology.ttl",
         True),
        ("^/bcite",
         "http://212.47.249.17",
         True),
        ("^/index/coci/sparql",
         "/index/sparql",
         True),
        ("^/index/croci/sparql",
         "/index/sparql",
         True),
        ("^/index/coci/search",
         "/index/search",
         True),
        ("^/index/croci/search",
         "/index/search",
         True),
        ("^/contacts",
         "/about",
         True),
        ("^/donate",
         "/membership",
         True)
    ],
    urls
)

# Set the web logger
web_logger = WebLogger("opencitations.net", c["log_dir"], [
    "REMOTE_ADDR",        # The IP address of the visitor
    "HTTP_USER_AGENT",    # The browser type of the visitor
    "HTTP_REFERER",       # The URL of the page that called your program
    "HTTP_HOST",          # The hostname of the page being attempted
    "REQUEST_URI",        # The interpreted pathname of the requested document
                          # or CGI (relative to the document root)
    "HTTP_AUTHORIZATION",  # Access token
    ],
    # comment this line only for test purposes
    {"REMOTE_ADDR": ["130.136.130.1", "130.136.2.47", "127.0.0.1"]}
)

meta_api_manager = APIManager(c["api_meta"])
meta_doc_manager = HTMLDocumentationHandler(meta_api_manager)

doci_api_manager = APIManager(c["api_doci"])
doci_doc_manager = HTMLDocumentationHandler(doci_api_manager)

poci_api_manager = APIManager(c["api_poci"])
poci_doc_manager = HTMLDocumentationHandler(poci_api_manager)

coci_api_manager = APIManager(c["api_coci"])
coci_doc_manager = HTMLDocumentationHandler(coci_api_manager)

coci_api_manager_v2 = APIManager(c["api_coci_v2"])
coci_doc_manager_v2 = HTMLDocumentationHandler(coci_api_manager_v2)

croci_api_manager = APIManager(c["api_croci"])
croci_doc_manager = HTMLDocumentationHandler(croci_api_manager)

index_api_manager = APIManager(c["api_index"])
index_doc_manager = HTMLDocumentationHandler(index_api_manager)

occ_api_manager = APIManager(c["api_occ"])
occ_doc_manager = HTMLDocumentationHandler(occ_api_manager)

wikidata_api_manager = APIManager(c["api_wikidata"])
wikidata_doc_manager = HTMLDocumentationHandler(wikidata_api_manager)

ccc_api_manager = APIManager(c["api_ccc"])
ccc_doc_manager = HTMLDocumentationHandler(ccc_api_manager)

rconn = Redis(host=c_auth["redis"]["host"],
              port=c_auth["redis"]["port"], db=c_auth["redis"]["db"])
app = web.application(rewrite.get_urls(), globals())
session = web.session.Session(app, web.session.DiskStore(
    "sessions"), initializer={"csrf": None})


def refreshCSRF():
    session.csrf = sha1(urandom(64)).hexdigest()


def validateAccessToken():
    auth_code = web.ctx.env.get('HTTP_AUTHORIZATION')
    if not auth_code is None:
        val = rconn.get(auth_code)
        if val is None or val != b'1':
            raise web.HTTPError(
                "403 ",
                {
                   "Content-Type": "text/plain"
                },
                "The access token provided is not valid."
            )


def sendEmail(recipient, subject, body):
    sender = c_smtp["email"]
    if not isinstance(recipient, list):
        recipient = [recipient]

    message = MIMEMultipart('alternative')
    message['Subject'] = subject
    message['From'] = sender
    message['To'] = ", ".join(recipient)
    html_body = MIMEText(body, 'html')
    message.attach(html_body)

    #Define SMTP
    server = smtplib.SMTP(c_smtp["address"], c_smtp["port"])
    server.starttls()
    server.login(sender, c_smtp["password"])

    #Send email
    server.sendmail(sender, recipient, message.as_string())
    server.close()


class AuthCodeConfirm:
    def GET(self, token):
        check = rconn.get(token)
        if check is None or check != b'2':
            auth_code = None
        else:
            rconn.delete(token)
            rconn.set(token, 1)
            auth_code = token
        return render.accesstokenconfirm(pages, active, auth_code, c_auth["messages"]["accesstokenconfirm"])


class AuthCode:
    def __init__(self):
        self.__rgx = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

    def GET(self):
        refreshCSRF()
        web_logger.mes()
        return render.accesstoken(pages, active, c_captcha["PUBKEY"], None, session.csrf, c_auth["messages"]["accesstoken"])

    def POST(self):
        data = web.input()

        session_csrf = session.csrf
        refreshCSRF()

        # Validate email
        email = data.tokenEmail
        if not re.fullmatch(self.__rgx, email):
            return render.accesstoken(pages, active,  c_captcha["PUBKEY"], c_auth["messages"]["accesstoken"]["invalid_email"], session.csrf, c_auth["messages"]["accesstoken"])

        # Validate recaptcha
        recaptcha = data['g-recaptcha-response']

        params = urlparse.urlencode({
            'secret': c_captcha["PRVKEY"],
            'response': recaptcha,
        })
        data_res = urllib.urlopen(
            'https://www.google.com/recaptcha/api/siteverify', params.encode('utf-8')).read()
        result = json.loads(data_res.decode('utf-8'))
        success = result.get('success', None)

        if not success == True:
            return render.accesstoken(pages, active,  c_captcha["PUBKEY"],  c_auth["messages"]["accesstoken"]["invalid_captcha"], session.csrf, c_auth["messages"]["accesstoken"])

        # CSFR Attack
        csrf = data.csrf
        #if csrf != session_csrf:
        #    return render.accesstoken(pages, active,  c_captcha["PUBKEY"], c_auth["messages"]["accesstoken"]["invalid_form"], session.csrf, c_auth["messages"]["accesstoken"])

        # Generate temporary token
        token = str(uuid.uuid4())
        while not rconn.get(token) is None:
            token = str(uuid.uuid4())
        rconn.set(token, 2, ex=3600)
        email_msg = c_auth["messages"]["email"]
        email_link = c["oc_base_url"]+"/accesstoken/" + token
        sendEmail(email, email_msg["title"], """\
<html>
  <head></head>
  <body>
      <div style="text-align: center">
      <img width=100 src='%s'>
        <h2><font color="#AA53FD">Access-Token</font> <font color="#3C40E5">Request</font></h2>
        <br>
        %s<br>
        <h3>%s <a href='%s' style="background-color:#AA53FD;color:white;padding:8px;border-radius:3px;">%s</a></h3>

        %s<br><br>
       </div>
       %s
       <br><br>
       %s %s</body>
</html>
""" % (
            "https://raw.githubusercontent.com/opencitations/logo/master/logo-transparent.png",
            email_msg["description"],
            email_msg["token"],
            email_link,
            email_msg["token_button"],
            email_msg["ignore"],
            email_msg["signature"],
            email_msg["html_message"],
            email_link
        ))

        return render.accesstokensuccess(pages, active, c_auth["messages"]["accesstokensuccess"])


class RawGit:
    def GET(self, u):
        web_logger.mes()
        raise web.seeother(
            "http://rawgit.com/essepuntato/opencitations/master" + u)


class Robots:
    def GET(self):
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Content-Type', "text/plain")
        return "user-agent: %s\n" \
               "disallow: /corpus/\ndisallow: /virtual/\ndisallow: /index/coci/\n\n" \
               "user-agent: %s\n" \
               "disallow: /" % ("\nuser-agent: ".join(
                   c["robots"]), "\nuser-agent: ".join(c["robots-all"]))


class Redirect:
    def GET(self, u):
        web_logger.mes()
        raise web.seeother(rewrite.rewrite(u))


class WorkInProgress:
    def GET(self, active):
        web_logger.mes()
        return render.wip(pages, active)


class Querying:
    def GET(self, active):
        web_logger.mes()
        return render.querying(pages, active)


class Tools:
    def GET(self, active):
        web_logger.mes()
        return render.tools(pages, active)


class Membership:
    def GET(self, active):
        web_logger.mes()
        return render.membership(pages, active)


class Home:
    def GET(self):
        web_logger.mes()
        return render.home(pages, "")


class Api:

    def OPTIONS(self, dataset, call):
        # remember to remove the slash at the end
        org_ref = web.ctx.env.get('HTTP_REFERER')
        if org_ref is not None:
            org_ref = org_ref[:-1]
        else:
            org_ref = "*"
        web.header('Access-Control-Allow-Origin', org_ref)
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', '*')
        web.header('Access-Control-Allow-Headers', 'Authorization')

    def GET(self, dataset, call):
        validateAccessToken()
        man = None

        if dataset == "":
            man = occ_api_manager
            doc = occ_doc_manager
        elif dataset == "coci":
            man = coci_api_manager
            doc = coci_doc_manager
            if "v2" in call:
                man = coci_api_manager_v2
                doc = coci_doc_manager_v2
        elif dataset == "doci":
            man = doci_api_manager
            doc = doci_doc_manager
        elif dataset == "poci":
            man = poci_api_manager
            doc = poci_doc_manager
        elif dataset == "croci":
            man = croci_api_manager
            doc = croci_doc_manager
        elif dataset == "index":
            man = index_api_manager
            doc = index_doc_manager
        elif dataset == "wikidata":
            man = wikidata_api_manager
            doc = wikidata_doc_manager
        elif dataset == "ccc":
            man = ccc_api_manager
            doc = ccc_doc_manager
        elif dataset == "meta":
            man = meta_api_manager
            doc = meta_doc_manager

        if man is None:
            raise web.notfound()
        else:
            if re.match("^/api/v[1-9][0-9]*/?$", call):
                # remember to remove the slash at the end
                org_ref = web.ctx.env.get('HTTP_REFERER')
                if org_ref is not None:
                    org_ref = org_ref[:-1]
                else:
                    org_ref = "*"

                web.header('Access-Control-Allow-Origin', org_ref)
                web.header('Access-Control-Allow-Credentials', 'true')
                web.header('Content-Type', "text/html")
                web.header('Access-Control-Allow-Methods', '*')
                web.header('Access-Control-Allow-Headers', 'Authorization')
                web_logger.mes()
                return doc.get_documentation()[1]
            else:
                content_type = web.ctx.env.get('HTTP_ACCEPT')
                if content_type is not None and "text/csv" in content_type:
                    content_type = "text/csv"
                else:
                    content_type = "application/json"

                operation_url = call + unquote(web.ctx.query)
                op = man.get_op(operation_url)
                if type(op) is Operation:
                    status_code, res, c_type = op.exec(
                        content_type=content_type)
                    if status_code == 200:
                        # remember to remove the slash at the end
                        org_ref = web.ctx.env.get('HTTP_REFERER')
                        if org_ref is not None:
                            org_ref = org_ref[:-1]
                        else:
                            org_ref = "*"

                        web.header('Access-Control-Allow-Origin', org_ref)
                        web.header('Access-Control-Allow-Credentials', 'true')
                        web.header('Content-Type', c_type)
                        web.header('Access-Control-Allow-Methods', '*')
                        web.header('Access-Control-Allow-Headers',
                                   'Authorization')
                        web_logger.mes()
                        return res
                    else:
                        try:
                            with StringIO(res) as f:
                                if content_type == "text/csv":
                                    mes = next(csv.reader(f))[0]
                                else:
                                    mes = json.dumps(
                                        next(csv.DictReader(f)), ensure_ascii=False)
                            raise web.HTTPError(
                                str(status_code)+" ", {"Content-Type": content_type}, mes)
                        except:
                            raise web.HTTPError(
                                str(status_code)+" ", {"Content-Type": content_type}, str(res))
                else:
                    raise web.HTTPError(
                        "404 ", {"Content-Type": content_type}, "No API operation found at URL '%s'" % call)


class Policy:
    def GET(self, active):
        web_logger.mes()
        return render.policy(pages, active)


class About:
    def GET(self, active):
        web_logger.mes()
        return render.about(pages, active)


class Corpus:
    def GET(self):
        web_logger.mes()
        cur_date = "January 1, 1970"
        cur_tot = "0"
        cur_cit = "0"
        cur_cited = "0"

        if path.exists(c["statistics"]):
            with open(c["statistics"]) as f:
                lastrow = None
                for lastrow in csv.reader(f):
                    pass
                cur_date = datetime.strptime(
                    lastrow[0], "%Y-%m-%dT%H:%M:%S").strftime("%B %d, %Y")
                cur_tot = lastrow[5]
                cur_cit = lastrow[2]
                cur_cited = lastrow[6]
        return render.corpus(pages, active["corpus"], cur_date, cur_tot, cur_cit, cur_cited)


class OCI:
    def GET(self, oci):
        data = web.input()
        if "oci" in data:
            clean_oci = re.sub("\s+", "", re.sub("^oci:", "",
                               data.oci.strip(), flags=re.IGNORECASE))

            cur_format = ".rdf"
            if "format" in data:
                cur_format = "." + data.format.strip().lower()

            raise web.seeother(c["oc_base_url"]
                               + "/oci/" + clean_oci + cur_format)

        elif oci is None or oci.strip() == "":
            web_logger.mes()
            return render.oci(pages, active["oci"])
        else:
            web_logger.mes()
            clean_oci, ex = re.findall(
                "^([^\.]+)(\.[a-z]+)?$", oci.strip().lower())[0]
            exs = (".csv", ".json", ".scholix",
                   ".jsonld", ".ttl", ".nt", ".xml")
            if ex in exs:
                cur_format = ex[1:]
                om_conf = c["ved_conf"]
                om = OCIManager(
                    "oci:" + clean_oci[1:], om_conf["lookup"], om_conf["oci_conf"])
                cit = om.get_citation_data(cur_format)
                if cit:
                    if cur_format == "csv":
                        ct_header = "text/csv"
                    elif cur_format == "jsonld":
                        ct_header = "application/ld+json"
                    elif cur_format == "ttl":
                        ct_header = "text/turtle"
                    elif cur_format == "nt":
                        ct_header = "application/n-triples"
                    elif cur_format == "xml":
                        ct_header = "application/rdf+xml"
                    else:
                        ct_header = "application/json"

                    web.header('Access-Control-Allow-Origin', '*')
                    web.header('Access-Control-Allow-Credentials', 'true')
                    web.header('Content-Type', ct_header)
                    return cit
            else:
                raise web.seeother(c["oc_base_url"]
                                   + c["virtual_local_url"] + "ci" + clean_oci)


class InTRePID:
    def GET(self, intrepid):
        data = web.input()
        if "intrepid" in data:
            clean_intrepid = re.sub(
                "\s+", "", re.sub("^intrepid:", "", data.intrepid.strip(), flags=re.IGNORECASE))

            om_conf = c["ved_conf"]
            im = InTRePIDManager("intrepid:" + clean_intrepid,
                                 om_conf["lookup"], om_conf["intrepid_conf"])
            rp = im.execute_query()
            raise web.seeother(c["oc_base_url"]
                               + c["ccc_local_url"] + rp.split("/ccc/")[1])
        elif intrepid is None or intrepid.strip() == "":
            web_logger.mes()
            return render.intrepid(pages, active["intrepid"])
        else:
            web_logger.mes()
            clean_intrepid, ex = re.findall(
                "^([^\.]+)(\.[a-z]+)?$", intrepid.strip().lower())[0]
            exs = (".jsonld", ".ttl", ".nt", ".xml")
            if ex in exs:
                cur_format = ex[1:]
                om_conf = c["ved_conf"]
                im = InTRePIDManager(
                    "intrepid:" + clean_intrepid, om_conf["lookup"], om_conf["intrepid_conf"])
                rp = im.get_rp_data(cur_format)
                if rp:
                    if cur_format == "jsonld":
                        ct_header = "application/ld+json"
                    elif cur_format == "ttl":
                        ct_header = "text/turtle"
                    elif cur_format == "nt":
                        ct_header = "application/n-triples"
                    else:
                        ct_header = "application/rdf+xml"

                    web.header('Access-Control-Allow-Origin', '*')
                    web.header('Access-Control-Allow-Credentials', 'true')
                    web.header('Content-Type', ct_header)
                    return rp
            else:
                om_conf = c["ved_conf"]
                im = InTRePIDManager(
                    "intrepid:" + clean_intrepid[1:], om_conf["lookup"], om_conf["intrepid_conf"])
                rp = im.execute_query()
                raise web.seeother(c["oc_base_url"]
                                   + c["ccc_local_url"] + rp.split("/ccc/")[1])


class Index:
    def GET(self):
        web_logger.mes()
        return render.index(pages, active["index"])


class CCC:
    def GET(self):
        web_logger.mes()
        return render.ccc(pages, active["ccc"])


class Meta:
    def GET(self):
        web_logger.mes()
        return render.meta(pages, active["meta"])


class Coci:
    def GET(self):
        web_logger.mes()
        return render.coci(pages, active["coci"])


class Doci:
    def GET(self):
        web_logger.mes()
        return render.doci(pages, active["doci"])


class Poci:
    def GET(self):
        web_logger.mes()
        return render.poci(pages, active["poci"])


class Croci:
    def GET(self):
        web_logger.mes()
        return render.croci(pages, active["croci"])


class Download:
    def GET(self, active):
        web_logger.mes()
        return render.download(pages, active)


class Search:
    def __init__(self, render_page):
        self.render_page = render_page

    def GET(self):
        web_logger.mes()
        query_string = web.ctx.env.get("QUERY_STRING")
        return self.render_page(pages, active["search"], query_string)


class SearchIndex(Search):
    def __init__(self):
        Search.__init__(self, render.search_index)


class SearchOC(Search):
    def __init__(self):
        Search.__init__(self, render.search)


class SearchCCC(Search):
    def __init__(self):
        Search.__init__(self, render.search_ccc)


class Browser:
    def __init__(self, render_page):
        self.render_page = render_page

    def GET(self, res_id):
        web_logger.mes()
        return self.render_page(res_id)


class BrowserIndex(Browser):
    def __init__(self):
        Browser.__init__(self, render.browser_index)


class BrowserOC(Browser):
    def __init__(self):
        Browser.__init__(self, render.browser)


class BrowserCCC(Browser):
    def __init__(self):
        Browser.__init__(self, render.browser_ccc)


class Model:
    def GET(self, active):
        web_logger.mes()
        return render.model(pages, active)


class Datasets:
    def GET(self, active):
        web_logger.mes()
        return render.datasets(pages, active)


class Publications:
    def GET(self, active):
        web_logger.mes()
        return render.publications(pages, active)


class Licenses:
    def GET(self, active):
        web_logger.mes()
        return render.licenses(pages, active)


class Contacts:
    def GET(self, active):
        web_logger.mes()
        return render.contacts(pages, active)


class Sparql:
    def __init__(self, sparql_endpoint, sparql_endpoint_title, yasqe_sparql_endpoint):
        self.sparql_endpoint = sparql_endpoint
        self.sparql_endpoint_title = sparql_endpoint_title
        self.yasqe_sparql_endpoint = yasqe_sparql_endpoint

    def GET(self):
        content_type = web.ctx.env.get('CONTENT_TYPE')
        return self.__run_query_string(active["sparql"], web.ctx.env.get("QUERY_STRING"), content_type)

    def POST(self):
        content_type = web.ctx.env.get('CONTENT_TYPE')

        cur_data = web.data().decode("utf-8")

        if "application/x-www-form-urlencoded" in content_type:
            return self.__run_query_string(active["sparql"], cur_data, True, content_type)
        elif "application/sparql-query" in content_type:
            return self.__contact_tp(cur_data, True, content_type)
        else:
            raise web.redirect("/sparql")

    def __contact_tp(self, data, is_post, content_type):
        accept = web.ctx.env.get('HTTP_ACCEPT')
        if accept is None or accept == "*/*" or accept == "":
            accept = "application/sparql-results+xml"
        if is_post:
            req = requests.post(self.sparql_endpoint, data=data,
                                headers={'content-type': content_type, "accept": accept})
        else:
            req = requests.get("%s?%s" % (self.sparql_endpoint, data),
                               headers={'content-type': content_type, "accept": accept})

        if req.status_code == 200:
            web.header('Access-Control-Allow-Origin', '*')
            web.header('Access-Control-Allow-Credentials', 'true')
            web.header('Content-Type', req.headers["content-type"])
            web_logger.mes()
            req.encoding = "utf-8"

            return req.text
        else:
            raise web.HTTPError(
                str(req.status_code)+" ", {"Content-Type": req.headers["content-type"]}, req.text)

    def __run_query_string(self, active, query_string, is_post=False,
                           content_type="application/x-www-form-urlencoded"):
        parsed_query = urlparse.parse_qs(query_string)
        if query_string is None or query_string.strip() == "":
            web_logger.mes()
            return render.sparql(pages, active, self.sparql_endpoint_title, self.yasqe_sparql_endpoint)
        if re.search("updates?", query_string, re.IGNORECASE) is None:
            if "query" in parsed_query:
                return self.__contact_tp(query_string, is_post, content_type)
            else:
                raise web.redirect("/sparql")
        else:
            raise web.HTTPError(
                "403 ", {"Content-Type": "text/plain"}, "SPARQL Update queries are not permitted.")


class SparqlOC(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint"],
                        "Corpus", c["oc_base_url"]+"/sparql")


class SparqlIndex(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint_index"],
                        "Indexes", c["oc_base_url"]+"/index/sparql")


class SparqlMeta(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint_meta"],
                        "OC-Meta", c["oc_base_url"]+"/meta/sparql")


class SparqlCCC(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint_ccc"],
                        "CCC", c["oc_base_url"]+"/ccc/sparql")


class Virtual:
    def GET(self, file_path=None):
        ldd = LinkedDataDirector(
            c["occ_base_path"], c["html"], c["oc_base_url"],
            c["json_context_path"], c["corpus_local_url"],
            label_conf=c["label_conf"], tmp_dir=c["tmp_dir"],
            dir_split_number=int(c["dir_split_number"]),
            file_split_number=int(c["file_split_number"]),
            default_dir=c["default_dir"])
        ved = VirtualEntityDirector(ldd, c["virtual_local_url"], c["ved_conf"])
        cur_page = ved.redirect(file_path)
        if cur_page is None:
            raise web.notfound()
        else:
            web_logger.mes()
            return cur_page


class ContentNegotiation:
    def __init__(self, base_url, local_url, context_path=None, from_triplestore=None, label_func=None):
        self.base_url = base_url
        self.local_url = local_url
        self.from_triplestore = from_triplestore
        self.label_func = label_func
        self.context_path = context_path

    def GET(self, file_path=None):
        ldd = LinkedDataDirector(
            c["occ_base_path"], c["html"], self.base_url,
            self.context_path, self.local_url,
            label_conf=c["label_conf"], tmp_dir=c["tmp_dir"],
            dir_split_number=int(c["dir_split_number"]),
            file_split_number=int(c["file_split_number"]),
            default_dir=c["default_dir"], from_triplestore=self.from_triplestore,
            label_func=self.label_func)
        cur_page = ldd.redirect(file_path)
        if cur_page is None:
            raise web.notfound()
        else:
            web_logger.mes()
            return cur_page


class CorpusContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["oc_base_url"], c["corpus_local_url"],
                                    context_path=c["json_context_path"],
                                    from_triplestore=c["sparql_endpoint"])


class CCCContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["oc_base_url"], c["ccc_local_url"],
                                    context_path=c["ocdm_json_context_path"],
                                    from_triplestore=c["sparql_endpoint_ccc"],
                                    label_func=lambda u: "%s %s" % re.findall("^.+/ccc/(..)/070(.+)$", u)[0])


class CociContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["index_base_url"], c["coci_local_url"],
                                    context_path=c["ocdm_json_context_path"],
                                    from_triplestore=c["sparql_endpoint_index"],
                                    label_func=lambda u: "oci:%s" % re.findall(
                                        "^.+/ci/(.+)$", u)[0]
                                    if "/ci/" in u else "provenance agent 1" if "/pa/1" in u
                                    else "COCI")


class DociContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["index_base_url"], c["doci_local_url"],
                                    context_path=c["ocdm_json_context_path"],
                                    from_triplestore=c["sparql_endpoint_index"],
                                    label_func=lambda u: "oci:%s" % re.findall(
                                        "^.+/ci/(.+)$", u)[0]
                                    if "/ci/" in u else "provenance agent 1" if "/pa/1" in u
                                    else "DOCI")


class CrociContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["index_base_url"], c["croci_local_url"],
                                    context_path=c["ocdm_json_context_path"],
                                    from_triplestore=c["sparql_endpoint_index"],
                                    label_func=lambda u: "oci:%s" % re.findall(
                                        "^.+/ci/(.+)$", u)[0]
                                    if "/ci/" in u else "CROCI")


class StatisticsIndex:
    def GET(self, active):
        web_logger.mes()
        return render.statistics(pages, active)


class Statistics:
    def __init__(self):
        self.__file_regex = re.compile('oc-(\d\d\d\d)-(\d\d).prom')
        self.__dates_regex = re.compile('(\d+)-(\d+)_(\d+)-(\d+)')

    def OPTIONS(self, date):
        # remember to remove the slash at the end
        org_ref = web.ctx.env.get('HTTP_REFERER')
        if org_ref is not None:
            if org_ref.endswith("/"):
                org_ref = org_ref[:-1]
        else:
            org_ref = "*"
        web.header('Access-Control-Allow-Origin', org_ref)
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', '*')
        web.header('Access-Control-Allow-Headers', 'Authorization')

    def GET(self, date):
        validateAccessToken()
        web_logger.mes()
        file_path = ""

        # Allow origin
        # remember to remove the slash at the end
        # remember to remove the slash at the end
        org_ref = web.ctx.env.get('HTTP_REFERER')
        if org_ref is not None:
            if org_ref.endswith("/"):
                org_ref = org_ref[:-1]
        else:
            org_ref = "*"

        web.header('Access-Control-Allow-Origin', org_ref)
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Access-Control-Allow-Methods', '*')
        web.header('Access-Control-Allow-Headers', 'Authorization')

        # checks if any date has been specified, otherwise looks for the most recent statistics
        if(date != "last-month"):
            if self.__dates_regex.match(date):
                search = self.__dates_regex.search(date)

                month_from = search.group(2)
                year_from = search.group(1)
                month_to = search.group(4)
                year_to = search.group(3)

                if year_from > year_to or (year_from == year_to and month_from > month_to):
                    raise web.HTTPError(
                        "400 ",
                        {
                            "Content-Type": "text/plain"
                        },
                        "Bad date provided, the ending date is lower than the beginning date."
                    )

                registry = CollectorRegistry()

                # Counter of accesses to different endpoints oc
                http_requests = Counter(
                    'opencitations_http_requests',
                    'Counter for HTTP requests to opencitations endpoints',
                    ['endpoint'],
                    registry=registry
                )

                # Aggregate counter of accesses to the different categories of endpoints oc
                agg_counter = Counter(
                    'opencitations_agg_counter',
                    'Aggregate HTTP requests counter to opencitations endpoints',
                    ['category'],
                    registry=registry
                )
                i = Info(
                    'opencitations_date',
                    'Date to which the statistics refers to',
                    registry=registry
                )
                i.info({'month_from': str(month_from), 'year_from': str(
                    year_from), "month_to": str(month_to), 'year_to': str(year_to)})

                indexed_records = Gauge(
                    'opencitations_indexed_records',
                    'Indexed records',
                    registry=registry
                )
                harvested_data_sources = Gauge(
                    'opencitations_harvested_data_sources',
                    'Harvested data sources',
                    registry=registry
                )

                current_month = int(month_from)
                current_year = int(year_from)
                target_month = int(month_to)
                target_year = int(year_to)

                while(True):
                    # For each month collects the statistics and adds
                    # them to the ones to be returned.
                    while(True):
                        current_month_str = str(current_month)
                        if len(current_month_str) == 1:
                            current_month_str = '0' + current_month_str
                        file_path = path.join(
                            c["stats_dir"], "oc-" + str(current_year) + "-" + current_month_str + ".prom")
                        if path.isfile(file_path):
                            f = open(file_path, 'r')
                            families = text_fd_to_metric_families(f)
                            for family in families:
                                for sample in family.samples:
                                    if sample[0] == "opencitations_agg_counter_total":
                                        agg_counter.labels(
                                            **sample[1]).inc(sample[2])
                                    if sample[0] == "opencitations_http_requests_total":
                                        http_requests.labels(
                                            **sample[1]).inc(sample[2])
                                    if sample[0] == "opencitations_indexed_records":
                                        indexed_records.set(sample[2])
                                    if sample[0] == "opencitations_harvested_data_sources":
                                        harvested_data_sources.set(sample[2])

                        # If we reaches the target year and the month we are visiting is the last one
                        # or if we visited the whole year i.e. the last month has just been visited
                        # exit the months's loop
                        if (current_year == target_year and current_month >= target_month) or current_month == 12:
                            break
                        current_month += 1

                    # If we visited all the years than we exit the years's loop
                    if(current_year == target_year):
                        break
                    current_year += 1
                    current_month = 1

                return generate_latest(registry)
            else:
                file_name = "oc-" + date + ".prom"
                if self.__file_regex.match(file_name):
                    file_path = path.join(c["stats_dir"], file_name)
                    if not path.isfile(file_path):
                        file_path = ''
                else:
                    raise web.HTTPError(
                        "400 ",
                        {
                            "Content-Type": "text/plain"
                        },
                        "Bad date format the required one is: year-month or year-month_year-month."
                    )
        else:
            max_year = 0
            max_month = 0
            for file in listdir(c["stats_dir"]):
                if self.__file_regex.match(file):
                    groups = self.__file_regex.search(file).groups()
                    # checks that the file respects the format in the name
                    year = int(groups[0])
                    month = int(groups[1])
                    if year > max_year or (year == max_year and month > max_month):
                        max_year = year
                        max_month = month
                        file_path = path.join(c["stats_dir"], file)

        # if the statistics file was found then it returns the content
        if file_path != "":
            web.header('Content-Type', "document")
            f = open(file_path, 'r')
            content = f.read()
            f.close()
            web.ctx.status = '200 OK'
            return content
        else:
            raise web.HTTPError(
                "404 ",
                {
                    "Content-Type": "text/plain"
                },
                "No statistics found."
            )


if __name__ == "__main__":
    app.run()
