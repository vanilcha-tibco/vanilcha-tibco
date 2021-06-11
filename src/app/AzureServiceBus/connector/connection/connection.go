package azureservicebusconnection

import (
	"encoding/json"
	"errors"
	"fmt"

	"git.tibco.com/git/product/ipaas/wi-contrib.git/connection/generic"
	"github.com/project-flogo/core/data/coerce"
	"github.com/project-flogo/core/data/metadata"
	"github.com/project-flogo/core/support/connection"
	"github.com/project-flogo/core/support/log"
)

type Settings struct {
	ResourceURI           string `md:"resourceURI"`
	AuthorizationRuleName string `md:"authorizationRuleName"`
	Description           string `md:"description"`
	DocsMetadata          string `md:"DocsMetadata"`
	Name                  string `md:"name"`
	PrimarysecondaryKey   string `md:"primarysecondaryKey"`
	ConfigProperties      string `md:"configProperties"`
}

type AzureToken struct {
	AuthorizationRuleName string `json:"authorizationRuleName"` // Needed for now as currently in TCI ClientID is fetched from env.
	PrimarysecondaryKey   string `json:"primarysecondaryKey"`
	ResourceURI           string `json:"resource_url"`
}

type AzureServiceBusSharedConfigManager struct {
	AzureToken          *AzureToken
	ConnectionName      string
	AccountSID          string
	PrimarysecondaryKey string
	DocsMetadata        string
	DocsObject          map[string]interface{}
	ConfigProperties    string
}

var logCache = log.ChildLogger(log.RootLogger(), "azureServiceBus-connection")
var factory = &AzureServiceBusManagerFactory{}

func init() {
	logCache.Debug("Calling init()")
	err := connection.RegisterManagerFactory(factory)
	if err != nil {
		panic(err)
	}
}

type AzureServiceBusManagerFactory struct {
}

func (*AzureServiceBusManagerFactory) Type() string {
	return "AzureServiceBus"
}

func (s *AzureServiceBusSharedConfigManager) Type() string {
	return "AzureServiceBus"
}

func (s *AzureServiceBusSharedConfigManager) GetConnection() interface{} {
	return s
}

func (s *AzureServiceBusSharedConfigManager) ReleaseConnection(connection interface{}) {

}

func (*AzureServiceBusManagerFactory) NewManager(settings map[string]interface{}) (connection.Manager, error) {
	sharedConn := &AzureServiceBusSharedConfigManager{}
	var err error
	err = sharedConn.getAzureServiceBusClientConfig(settings)
	if err != nil {
		return nil, err
	}
	return sharedConn, nil
}

func (ascm *AzureServiceBusSharedConfigManager) getAzureServiceBusClientConfig(settings map[string]interface{}) error {
	s := &Settings{}
	var token AzureToken

	err := metadata.MapToStruct(settings, s, false)
	if err != nil {
		logCache.Errorf("Error occured during Settings MapToStruct conversion in getAzureServiceBusClientConfig()..")
		return err
	}

	ascm.ConnectionName = s.Name
	//logCache.Debugf("Printing setting Data", s.Name, s.AccountSID, s.AuthToken)

	if ascm.ConnectionName != "" {

		//hscm.Timeout = s.Timeout
		if ascm.DocsObject == nil {
			var docsMetadata interface{}
			err = json.Unmarshal([]byte(s.DocsMetadata), &docsMetadata)

			if err != nil {
				return fmt.Errorf("Cannot deserialize schema document from connection %s", err.Error())

			}
			//s.DocsObject =
			ascm.DocsObject = docsMetadata.(map[string]interface{})
		}

		ascm.DocsMetadata = s.DocsMetadata
		token.AuthorizationRuleName = s.AuthorizationRuleName
		token.PrimarysecondaryKey = s.PrimarysecondaryKey
		token.ResourceURI = s.ResourceURI ///this need to be set correcctly

		logCache.Debugf("value set to token struct")

		ascm.ConnectionName = s.Name
		if ascm.ConnectionName != "" {
			ascm.AzureToken = &token

			return nil
		}
	}
	return fmt.Errorf("The connection name is empty")
}

func GetSharedConfiguration(conn interface{}) (connection.Manager, error) {
	var cManager connection.Manager
	var err error
	_, ok := conn.(map[string]interface{})
	if ok {
		cManager, err = handleLegacyConnection(conn)
	} else {
		cManager, err = coerce.ToConnection(conn)
	}
	if err != nil {
		return nil, err
	}
	return cManager, nil
}

func handleLegacyConnection(conn interface{}) (connection.Manager, error) {
	connectionObject, _ := coerce.ToObject(conn)
	if connectionObject == nil {
		return nil, errors.New("Connection object is nil")
	}
	id := connectionObject["id"].(string)
	cManager := connection.GetManager(id)
	if cManager == nil {
		connObject, err := generic.NewConnection(connectionObject)
		if err != nil {
			return nil, err
		}
		cManager, err = factory.NewManager(connObject.Settings())
		if err != nil {
			return nil, err
		}
		err = connection.RegisterManager(id, cManager)
		if err != nil {
			return nil, err
		}
	}
	return cManager, nil
}
