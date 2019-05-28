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
from src.oci import OCIManager
import requests
import urllib.parse as urlparse
import re
import csv
from datetime import datetime
from os import path
from io import StringIO
from urllib.parse import unquote, parse_qs

# Load the configuration file
with open("conf.json") as f:
    c = json.load(f)

pages = [
    # Generic pages
    "/", "about", "corpus", "index", "model", "download",

    # OCC SPARQL-related pages
    "sparql", "search",

    # Other generic pages
    "oci", "publications", "licenses"
]

urls = (
    # Generic URLs
    "(/)", "Home",
    "/(wikidata)(/api/.+)", "Api",
    "/(index)(/api/.+)", "Api",
    "/index/([^/]+)(/api/.+)", "Api",
    "/(index/sparql)", "SparqlIndex",
    "/index/search", "SearchIndex",
    "/index/browser/(.+)", "BrowserIndex",
    "/(index)/coci", "Coci",
    "/(index)/croci", "Croci",
    "/index/coci/(prov/.*|index.*|ci/.*)?", "CociContentNegotiation",
    "/index/croci/(ci/.*)?", "CrociContentNegotiation",
    "/(about)", "About",
    "/(model)", "Model",
    "/(corpus)", "Corpus",
    "/corpus/(.+)", "CorpusContentNegotiation",
    "/corpus/", "CorpusContentNegotiation",
    "/virtual/(.+)", "Virtual",
    "/(oci)(/.+)?", "OCI",
    "/(download)", "Download",

    # OCC SPARQL-related urls
    "/(sparql)", "SparqlOC",
    "/search", "SearchOC",
    "/browser/(.+)", "BrowserOC",
    "()(/api/.+)", "Api",

    # Other generic URLs
    "/(publications)", "Publications",
    "/(licenses)", "Licenses",
    "(/paper/.+)", "RawGit",
    "/(index)", "Index",
    "/robots.txt", "Robots"
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
croci_api_manager = APIManager(c["api_croci"])
index_api_manager = APIManager(c["api_index"])
occ_api_manager = APIManager(c["api_occ"])
wikidata_api_manager = APIManager(c["api_wikidata"])

class RawGit:
    def GET(self, u):
        web_logger.mes()
        raise web.seeother("http://rawgit.com/essepuntato/opencitations/master" + u)

class Robots:
    def GET(self):
        web.header('Access-Control-Allow-Origin', '*')
        web.header('Access-Control-Allow-Credentials', 'true')
        web.header('Content-Type', "text/plain")
        return "user-agent: %s\n" \
               "disallow: /corpus/\ndisallow: /virtual/\ndisallow: /index/coci/\n\n" \
               "user-agent: %s\n" \
               "disallow: /" % ("\nuser-agent: ".join(c["robots"]), "\nuser-agent: ".join(c["robots-all"]))

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
        man = None

        if dataset == "":
            man = occ_api_manager
        elif dataset == "coci":
            man = coci_api_manager
        elif dataset == "croci":
            man = croci_api_manager
        elif dataset == "index":
            man = index_api_manager
        elif dataset == "wikidata":
            man = wikidata_api_manager

        if man is not None:
            if re.match("^/api/v[1-9][0-9]*/?$", call):
                web.header('Access-Control-Allow-Origin', '*')
                web.header('Access-Control-Allow-Credentials', 'true')
                web.header('Content-Type', "text/html")
                web_logger.mes()
                return man.get_htmldoc()[1]
            else:
                content_type = web.ctx.env.get('HTTP_ACCEPT')
                if content_type is not None and "text/csv" in content_type:
                    content_type = "text/csv"
                else:
                    content_type = "application/json"
                status_code, res, c_type = man.exec_op(call + unquote(web.ctx.query), content_type=content_type)
                if status_code == 200:
                    web.header('Access-Control-Allow-Origin', '*')
                    web.header('Access-Control-Allow-Credentials', 'true')
                    web.header('Content-Type', c_type)
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


class Corpus:
    def GET(self, active):
        web_logger.mes()
        return render.corpus(pages, active)


class OCI:
    def GET(self, active, oci):
        data = web.input()
        if "oci" in data:
            clean_oci = re.sub("\s+", "", re.sub("^oci:", "", data.oci.strip(), flags=re.IGNORECASE))

            cur_format = ".rdf"
            if "format" in data:
                cur_format = "." + data.format.strip().lower()

            raise web.seeother(c["oc_base_url"] + "/" + active + "/" + clean_oci + cur_format)

        elif oci is None or oci.strip() == "":
            web_logger.mes()
            return render.oci(pages, active)
        else:
            web_logger.mes()
            clean_oci, ex = re.findall("^([^\.]+)(\.[a-z]+)?$", oci.strip().lower())[0]
            exs = (".csv", ".json", ".scholix", ".jsonld", ".ttl", ".nt", ".xml")
            if ex in exs:
                cur_format = ex[1:]
                om_conf = c["ved_conf"]
                om = OCIManager("oci:" + clean_oci[1:], om_conf["lookup"], om_conf["oci_conf"])
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
                raise web.seeother(c["oc_base_url"] + c["virtual_local_url"] + "ci" + clean_oci)


class Index:
    def GET(self, active):
        web_logger.mes()
        return render.index(pages, active)


class Coci:
    def GET(self, active):
        web_logger.mes()
        return render.coci(pages, active)

class Croci:
    def GET(self, active):
        web_logger.mes()
        return render.croci(pages, active)


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


class SearchIndex(Search):
    def __init__(self):
        Search.__init__(self, "index", render.search_index)


class SearchOC(Search):
    def __init__(self):
        Search.__init__(self, "search", render.search)


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

        cur_data = web.data().decode("utf-8")

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
            req.encoding = "utf-8"

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


class SparqlIndex(Sparql):
    def __init__(self):
        Sparql.__init__(self, c["sparql_endpoint_index"], "Index", c["oc_base_url"]+"/index/sparql")


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
    def __init__(self, base_url, local_url, from_triplestore=None, label_func=None):
        self.base_url = base_url
        self.local_url = local_url
        self.from_triplestore = from_triplestore
        self.label_func = label_func

    def GET(self, file_path=None):
        ldd = LinkedDataDirector(
            c["occ_base_path"], c["html"], self.base_url,
            c["json_context_path"], self.local_url,
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
        ContentNegotiation.__init__(self, c["oc_base_url"], c["corpus_local_url"])


class CociContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["index_base_url"], c["coci_local_url"],
                                    c["sparql_endpoint_index"],
                                    lambda u: "oci:%s" % re.findall("^.+/ci/(.+)$", u)[0]
                                    if "/ci/" in u else "provenance agent 1" if "/pa/1" in u
                                    else "COCI")

class CrociContentNegotiation(ContentNegotiation):
    def __init__(self):
        ContentNegotiation.__init__(self, c["index_base_url"], c["croci_local_url"],
                                    c["sparql_endpoint_index"],
                                    lambda u: "oci:%s" % re.findall("^.+/ci/(.+)$", u)[0]
                                    if "/ci/" in u else "CROCI")


if __name__ == "__main__":
    app = web.application(rewrite.get_urls(), globals())
    app.run()
