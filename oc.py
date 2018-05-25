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
from src.ramose import APIManager
import requests
import urllib.parse as urlparse
import re
import csv
from datetime import datetime
from os import path
from io import StringIO

# Load the configuration file
with open("conf.json") as f:
    c = json.load(f)

pages = ["/", "about", "corpus", "model", "download", "sparql", "search", "oci",
         "publications", "licenses", "contacts"]

urls = (
    "(/)", "Home",
    "/(index/coci/sparql)", "SparqlCOCI",
    "/index/coci/search", "SearchCOCI",
    "/index/coci/browser/(.+)", "BrowserCOCI",
    "/index/([^/]+)(/api/.+)", "Api",
    "/(index/coci)(/.+)?", "Coci",
    "/(about)", "About",
    "/(model)", "Model",
    "/(corpus)", "CorpusIntro",
    "/corpus/(.+)", "Corpus",
    "/virtual/(.+)", "Virtual",
    "/(oci)(/.+)?", "OCI",
    "/corpus/", "Corpus",
    "/(download)", "Download",
    "/(sparql)", "SparqlOC",
    "/search", "SearchOC",
    "/browser/(.+)", "BrowserOC",
    "/(publications)", "Publications",
    "/(licenses)", "Licenses",
    "/(contacts)", "Contacts",
    "(/paper/.+)", "RawGit",
    "/(index)", "Index"
)

render = web.template.render(c["html"])

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
         True)
    ],
    urls
)

# Set the web logger
web_logger = WebLogger("opencitations.net", c["log_dir"], [
    "REMOTE_ADDR",      # The IP address of the visitor
    "HTTP_USER_AGENT",  # The browser type of the visitor
    "HTTP_REFERER",     # The URL of the page that called your program
    "HTTP_HOST",        # The hostname of the page being attempted
    "REQUEST_URI"       # The interpreted pathname of the requested document
                        # or CGI (relative to the document root)
    ],
    {"REMOTE_ADDR": ["130.136.130.1", "130.136.2.47", "127.0.0.1"]}  # comment this line only for test purposes
)

coci_api_manager = APIManager(c["api_coci"])

class RawGit:
    def GET(self, u):
        web_logger.mes()
        raise web.seeother("http://rawgit.com/essepuntato/opencitations/master" + u)


class Redirect:
    def GET(self, u):
        web_logger.mes()
        raise web.seeother(rewrite.rewrite(u))


class WorkInProgress:
    def GET(self, active):
        web_logger.mes()
        return render.wip(pages, active)


class Home:
    def GET(self, active):
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

        return render.home(pages, active, cur_date, cur_tot, cur_cit, cur_cited)


class Api:
    def GET(self, dataset, call):
        if dataset == "coci":
            if re.match("^/api/v[1-9][0-9]*/?$", call):
                web.header('Access-Control-Allow-Origin', '*')
                web.header('Access-Control-Allow-Credentials', 'true')
                web.header('Content-Type', "text/html")
                web_logger.mes()
                return coci_api_manager.get_htmldoc()[1]
            else:
                content_type = web.ctx.env.get('CONTENT_TYPE')
                if content_type is not None and "text/csv" in content_type:
                    content_type = "text/csv"
                else:
                    content_type = "application/json"

                status_code, res = coci_api_manager.exec_op(call, content_type=content_type)
                if status_code == 200:
                    web.header('Access-Control-Allow-Origin', '*')
                    web.header('Access-Control-Allow-Credentials', 'true')
                    web.header('Content-Type', content_type)
                    web_logger.mes()
                    return res
                else:
                    with StringIO(res) as f:
                        if content_type == "text/csv":
                            mes = next(csv.reader(f))[0]
                        else:
                            mes = json.dumps(next(csv.DictReader(f)), ensure_ascii=False)
                    raise web.HTTPError(
                        str(status_code), {"Content-Type": content_type}, mes)
        else:
            raise web.notfound()


class About:
    def GET(self, active):
        web_logger.mes()
        return render.about(pages, active)


class CorpusIntro:
    def GET(self, active):
        web_logger.mes()
        return render.corpus(pages, active)


class OCI:
    def GET(self, active, oci):
        data = web.input()
        if "oci" in data:
            clean_oci = re.sub("\s+", "", re.sub("^oci:", "", data.oci.strip(), flags=re.IGNORECASE))
            raise web.seeother(c["oc_base_url"] + "/" + active + "/" + clean_oci)
        elif oci is None or oci.strip() == "":
            web_logger.mes()
            return render.oci(pages, active)
        else:
            web_logger.mes()
            raise web.seeother(c["oc_base_url"] + c["virtual_local_url"] + "ci" + oci)


class Index:
    def GET(self, active):
        web_logger.mes()
        return render.index(pages, active)


class Coci:
    def GET(self, active, coci):
        web_logger.mes()
        splitactive = active.split("/")
        active = splitactive[0]
        if coci == None:
            return render.coci(pages, active)
        elif coci.startswith('/ci'):
            clean_coci = coci.replace("/ci", "")
            if clean_coci == "":
                #go to the main page of coci
                raise web.seeother(c["oc_base_url"] + "/index/coci")
            else:
                #in this case we should call the resource browser: ldd or lucinda
                raise web.seeother(c["oc_base_url"] + "/index/coci/browser" + coci)
        else:
            #go to the main page of coci
            raise web.seeother(c["oc_base_url"] + "/index/coci")

class Download:
    def GET(self, active):
        web_logger.mes()
        return render.download(pages, active)


class Search:
    def __init__(self, active_page, render_page):
        self.active_page = active_page
        self.render_page = render_page

    def GET(self):
        web_logger.mes()
        query_string = web.ctx.env.get("QUERY_STRING")
        return self.render_page(pages, self.active_page, query_string)


class SearchCOCI(Search):
    def __init__(self):
        Search.__init__(self, "index", render.search_coci)


class SearchOC(Search):
    def __init__(self):
        Search.__init__(self, "search", render.search)


class Browser:
    def __init__(self, render_page):
        self.render_page = render_page

    def GET(self, res_id):
        web_logger.mes()
        return self.render_page(res_id)


class BrowserCOCI(Browser):
    def __init__(self):
        Browser.__init__(self, render.browser_coci)


class BrowserOC(Browser):
    def __init__(self):
        Browser.__init__(self, render.browser)


class Model:
    def GET(self, active):
        web_logger.mes()
        return render.model(pages, active)


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

    def GET(self, active):
        content_type = web.ctx.env.get('CONTENT_TYPE')
        return self.__run_query_string(active, web.ctx.env.get("QUERY_STRING"), content_type)

    def POST(self, active):
        content_type = web.ctx.env.get('CONTENT_TYPE')
        web.debug("The content_type value: ")
        web.debug(content_type)

        cur_data = web.data()
        if "application/x-www-form-urlencoded" in content_type:
            return self.__run_query_string(active, cur_data, True, content_type)
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
            return req.text
        else:
            raise web.HTTPError(
                str(req.status_code), {"Content-Type": req.headers["content-type"]}, req.text)

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
                "403", {"Content-Type": "text/plain"}, "SPARQL Update queries are not permitted.")


class SparqlOC(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint"], "OCC", c["oc_base_url"]+"/sparql")


class SparqlCOCI(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint_coci"], "COCI", c["oc_base_url"]+"/index/coci/sparql")


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


class Corpus:
    def GET(self, file_path=None):
        ldd = LinkedDataDirector(
            c["occ_base_path"], c["html"], c["oc_base_url"],
            c["json_context_path"], c["corpus_local_url"],
            label_conf=c["label_conf"], tmp_dir=c["tmp_dir"],
            dir_split_number=int(c["dir_split_number"]),
            file_split_number=int(c["file_split_number"]),
            default_dir=c["default_dir"])
        cur_page = ldd.redirect(file_path)
        if cur_page is None:
            raise web.notfound()
        else:
            web_logger.mes()
            return cur_page


if __name__ == "__main__":
    app = web.application(rewrite.get_urls(), globals())
    app.run()
